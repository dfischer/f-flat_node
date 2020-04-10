import { signature, Any } from '@hypercubed/dynamo';

import { dynamo } from '../types/dynamo';
import { Key, Sentence } from '../types/words';
import { StackValue } from '../types/stack-values';
import { GlobalSymbol, ScopeModule } from '../types/vocabulary-values';

import { ffPrettyPrint, rewrite } from '../utils';

import { StackEnv } from '../engine/env';

/**
 * Converts a stack item to a "function" definition
 */
class CreateAction {
  @signature(GlobalSymbol)
  global(x: GlobalSymbol): GlobalSymbol {
    return x;
  }

  // arrays are converted to sentences
  @signature()
  array(x: any[]): Sentence {
    return new Sentence(x);
  }

  // objects are converted to and object of actions
  @signature()
  plainObject(obj: Object): Object {
    return Object.keys(obj).reduce((p, key) => {
      p[key] = createAction(obj[key]);
      return p;
    }, {});
  }

  // symbols are symbols
  @signature(Symbol)
  symbol(x: symbol): symbol {
    return x;
  }

  // everything else is converetd to a sentence containing the single item
  @signature(Any)
  any(x: any): Sentence {
    return new Sentence([x]);
  }
}

const createAction = dynamo.function(CreateAction);

// For all dictionary actions, note:
// * The dictionary is mutable
// * Stack items are immutable

/**
 * # Internal Vocabulary Words
 */
export const dict = {
  /**
   * ## `defer`
   *
   * Stores a value in the dictionary that raises an error when executed.
   * Used to allocate a word before it is used, for example in mutually-recursive
   *
   * `a: ⭢`
   *
   * ```
   * f♭> a: defer
   * [ ]
   * ```
   */
  defer(this: StackEnv, lhs: string | Key) {
    this.dict.set(String(lhs), undefined);
  },

  /**
   * ## `bind`
   *
   * recursivly converts words to global keys
   *
   * `[A*] ⭢ [B*]`
   *
   * ```
   * f♭> [ dup * ] bind
   * [ [ dup * ] ]
   * ```
   */
  bind(this: StackEnv, rhs: StackValue[]) {
    return this.dict.bind(rhs);
  },

  /**
   * ## `inline`
   *
   * recursivly expands words to global keys
   *
   * `[A*] ⭢ [B*]`
   *
   * ```
   * f♭> [ slip ] inline
   * [ [  q< eval q> ] ]
   * ```
   */
  inline(this: StackEnv, rhs: StackValue[]) {
    return this.dict.inline(rhs);
  },

  /**
   * ## `def`
   *
   * stores a definition in the current dictionary
   *
   * `a: [A*] ⭢`
   *
   * ```
   * f♭> sqr: [ dup * ] def
   * [ ]
   * ```
   */
  'def'(this: StackEnv, lhs: string | Key, rhs: StackValue[]) {
    this.dict.set(String(lhs), createAction(rhs));
  },

  /**
   * ## `;` (def)
   *
   * stores a definition in the current dictionary
   *
   * `a: [A*] ⭢`
   *
   * ```
   * f♭> sqr: [ dup * ] ;
   * [ ]
   * ```
   */
  // ';'(this: StackEnv, lhs: string | Key, rhs: StackValue[]) {
  //   this.dict.set(String(lhs), undefined);
  //   const action = createAction(this.dict.bind(rhs));
  //   this.dict.set(String(lhs), action);
  // },

  /**
   * ## `use`
   *
   * Move the contents of a map into scope
   * - The map must be a map of keys to global symbols generated by `vocab`
   *
   * `{a: b ...} ⭢`
   *
   * ```
   * f♭> { ... } use
   * [ ]
   * ```
   */
  use(this: StackEnv, dict: ScopeModule) {
    this.dict.useVocab(dict);
  },

  /**
   * ## `vocab`
   *
   * Write the current local vocabulary to the stack
   * - The returned value is a map of strings (keys) to global symbols
   *
   * `⭢ {a: b ...}`
   *
   * ```
   * f♭> vocab
   * [ { ... } ]
   * ```
   */
  vocab(this: StackEnv) {
    return this.dict.getVocab();
  },

  /**
   * ## `defined?`
   * returns true if the word is defined in the current vocabulary
   *
   * `a: ⭢ bool`
   *
   * ```
   * f♭> 'sqr' defined?
   * [ true ]
   * ```
   */
  'defined?'(this: StackEnv, a: string) {
    const r = this.dict.get(a);
    return typeof r !== 'undefined';
  },

  /**
   * ## `see`
   *
   * recalls the definition of a word as a string
   *
   * `a:||str ⭢ str`
   *
   * ```
   * f♭> 'sqr' see
   * [ '[ @@dup @@* ]' ]
   * ```
   */
  see(this: StackEnv, a: string | Key) {
    const r = this.dict.get(String(a));
    return typeof r === 'undefined' ? null : ffPrettyPrint.stringify(r);
  },

  /**
   * ## `show`
   *
   * prints the definition of a word as a formatted string
   *
   * `a:||str ⭢`
   *
   * ```
   * f♭> "sqr" show
   * [ dup * ]
   * [ ]
   * ```
   */
  show(this: StackEnv, a: string) {
    const r = this.dict.get(String(a));
    try {
      process.stdout.clearLine(-1);
      process.stdout.cursorTo(0);
    } catch (e) {}
    return console.log(ffPrettyPrint.color(r));
  },

  '.'(this: StackEnv, a: any) {
    try {
      process.stdout.clearLine(-1);
      process.stdout.cursorTo(0);
    } catch (e) {}
    console.log(ffPrettyPrint.color(a));
    console.log('');
  },

  /**
   * ## `words`
   *
   * `⭢ [str*]`
   *
   * returns a list of defined words
   */
  words(this: StackEnv): string[] {
    return this.dict.words();
  },

  /**
   * ## `locals`
   *
   * `⭢ [str*]`
   *
   * returns a list of locals words
   */
  locals(this: StackEnv): string[] {
    return this.dict.localWords();
  },

  /**
   * ## `scoped`
   *
   * `⭢ [str*]`
   *
   * returns a list of local scoped words
   */
  scoped(this: StackEnv): string[] {
    return this.dict.scopedWords();
  }
};
