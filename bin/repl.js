#!/usr/bin/env node

/* global process */

const repl = require('repl');
const readline = require('readline');
const program = require('commander');
const gradient = require('gradient-string');
const memoize = require('memoizee');

const { createStack, createRootEnv } = require('../dist/stack');
const { log, type, bar, ffPrettyPrint } = require('../dist/utils');

const pkg = require('../package.json');

const welcome = gradient.rainbow(`

          []]
          []]
[]]]]]]]] []] []]]      F♭ Version ${pkg.version}
[]]       []]]   []]    Copyright (c) 2000-2020 by Jayson Harshbarger
[]]       []]   []]     Documentation: http://hypercubed.github.io/f-flat_node/
[]]]]]]   []]  []]
[]]       []][]]        Type '.exit' to exit the repl
[]]                     Type '.clear' to reset
[]]                     Type '.help' for more help
`);

const initialPrompt = 'F♭> ';
// const altPrompt = 'F♭| ';

const bindings = [];

let arg = '';
let buffer = '';
let timeout = null;
let silent = false;
let stackRepl = null;

const writers = {
  pretty: (_) => ffPrettyPrint.color(_.stack) + '\n',
  literal: (_) => ffPrettyPrint.literal(_.stack) + '\n',
  silent: (_) => '',
};

let _writer = writers.pretty;

program
  .version(pkg.version)
  .usage('[options] [commands...]')
  .option('-L, --log-level [level]', 'Set the log level', 'warn')
  .option('-f, --file [file]', 'Evaluate contents of file')
  .option('-i, --interactive', 'force interactive mode', false)
  .option('-q, --quiet', `don't print initial banner`, false)
  .action((...cmds) => {
    cmds.pop();
    arg += cmds.join(' ');
  });

program.parse(process.argv);

if (typeof program.interactive === 'undefined') {
  program.interactive = !program.file && arg === '' && process && process.stdin.isTTY;
}

if (program.logLevel) {
  log.level = program.logLevel;
}

if (typeof program.quiet === 'undefined') {
  program.quiet = !program.interactive;
}

// TODO: start in user directory
process.chdir('./src/ff-lib/');

let f = newStack();

if (program.file) {
  f.promise(`"${program.file}" read await`).then(exitOrStartREPL);
}

if (arg !== '') {
  f.promise(arg).then(exitOrStartREPL);
}

if (!program.file && arg === '') {
  exitOrStartREPL();
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

// functions

function exitOrStartREPL() {
  if (!program.interactive) {
    process.exit();
  } else {
    stackRepl = startREPL();
  }
}

function startREPL() {
  const r = repl.start({
    prompt: initialPrompt,
    eval: fEval,
    writer: (_) => (_ instanceof Error) ? _.stack : _writer(_),
    ignoreUndefined: true,
    useColors: true,
    useGlobal: false,
    completer: memoize(completer, { maxAge: 10000 })
  });

  r.on('reset', () => {
    f = newStack();
    stackRepl.setPrompt(initialPrompt);
  });

  r.defineCommand('echo', {
    help: 'Toggle echo mode',
    action() {
      const entries = Object.entries(writers);
      const i = entries.findIndex(([_, v]) => v === _writer);
      const n = (i + 1) % entries.length;
      console.log(`Switched to ${entries[n][0]} mode\n`);
      _writer = entries[n][1];
      this.displayPrompt();
    }
  });

  const objectId = getUniqueObjectCounter();

  r.defineCommand('s', {
    // todo: move to core?
    help: 'Print the stack',
    action() {
      f.stack.forEach((d, i) => {
        const id = objectId(d).toString(16);
        console.log(
          `${f.stack.length - i}: ${ffPrettyPrint.color(d)} [${type(
            d
          )}] (${id})`
        );
      });
      this.displayPrompt();
    }
  });

  r.defineCommand('j', {
    help: 'Print the stack as JSON',
    action() {
      console.log(f.toJSON());
      this.displayPrompt();
    }
  });

  r.context = Object.create(null);

  return r;
}

function newStack() {
  log.level = program.logLevel || 'warn';

  const newParent = createStack('', createRootEnv());

  const rl =
    stackRepl ||
    readline.createInterface({
      input: process.stdin
    });

  newParent.defineAction('prompt', () => {
    return new Promise(resolve => {
      rl.question('', resolve);
    });
  });

  if (!program.quiet) {
    console.log(welcome);
  }

  const child = newParent.createChild(undefined);
  child.silent = !program.interactive;
  child.idle.add(() => bar.terminate());
  return child;
}

function fEval(code, _, __, cb) {
  if (code.slice(0, 2) === '({' && code.slice(-2) === '})') {
    code = code.slice(1, -1); // remove "(" and ")" added by node repl
  }

  buffer += `${code}\n`;
  global.clearTimeout(timeout);
  timeout = global.setTimeout(run, 60);

  function run() {
    global.clearTimeout(timeout);

    if (!buffer.length) {
      return;
    }

    addBefore();

    log.profile('dispatch');
    f.next(buffer)
      .then(result => {
        fin();
        cb(null, result);
      })
      .catch(err => {
        fin();
        cb(err);
      });

    buffer = '';

    function fin() {
      log.profile('dispatch');
      stackRepl.setPrompt(f.depth < 1 ? initialPrompt : `F♭${' '.repeat(f.depth)}| `);
    }
  }
}

function getUniqueObjectCounter() {
  const objIdMap = new WeakMap();
  let objectCount = 0;
  function objectId(o) {
    if (!objIdMap.has(o)) objIdMap.set(o, ++objectCount);
    return objIdMap.get(o);
  }
  return objectId;
}

function completer(line) {
  const completions = getKeys();
  const hits = completions.filter(c => c.startsWith(line));
  return [hits.length ? hits : completions, line];
}

function getKeys() {
  const keys = [];
  for (const prop in f.dict.locals) {
    keys.push(prop);
  }
  return keys;
}

function addBefore() {
  while (bindings.length > 0) {
    b = bindings.pop();
    b.detach();
  }

  let qMax = f.stack.length + f.queue.length;
  let last = new Date();

  // move these be part of winston logger?
  switch (log.level.toString()) {
    case 'trace':
      bindings.push(f.before.add(trace));
      bindings.push(f.beforeEach.add(trace));
      bindings.push(f.idle.add(trace));
      break;
    case 'warn': {
      if (f.silent) return;
      bindings.push(f.before.add(updateBar));
      bindings.push(f.beforeEach.add(throttledUpdateBar));
      bindings.push(f.idle.add(() => bar.terminate()));
    }
  }

  function trace() {
    console.log(ffPrettyPrint.formatTrace(f));
  }

  function throttledUpdateBar() {
    const q = f.stack.length + f.queue.length;
    if (q > qMax) qMax = q;

    const now = new Date();
    const delta = now - last;
    if (delta > 120) { // output frequency in ms
      updateBar();
      last = now;
    }
  }

  function updateBar() {
    bar.update(f.stack.length / qMax, {
      stack: f.stack.length,
      queue: f.queue.length,
      depth: f.depth,
      lastAction: ffPrettyPrint.trace(f.currentAction)
    });
  }
}
