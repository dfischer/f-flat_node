import test from 'ava';
import { check, gen } from 'ava-check';

import {
  F,
  fSyncJSON,
  fSyncStack,
  fSyncString,
  nearly,
  Decimal,
  options,
  fflatValue,
  ffArray,
  ffObject,
  ffNumber,
  ffString,
  ffBoolean,
  fflatPrim
} from './setup';

/* ADD */

test(
  'should join arrays',
  check(options, ffArray, ffArray, (t, a, b) => {
    const r = fSyncJSON(`${a} ${b} +`);
    t.is(r.length, 1);
    t.deepEqual(r[0], [...a.toJSON(), ...b.toJSON()]);
  })
);

test(
  'should or booleans',
  check(options, gen.boolean, gen.boolean, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} +`);
    t.is(r.length, 1);
    t.is(r[0], a || b);
  })
);

test(
  'should join objects',
  check(options, ffObject, ffObject, (t, a, b) => {
    const r = fSyncJSON(`${a} ${b} +`);
    t.is(r.length, 1);
    t.deepEqual(r[0], Object.assign({}, a.toJSON(), b.toJSON()));
  })
);

test(
  'should add numbers',
  check(options, ffNumber, ffNumber, (t, a, b, c) => {
    const r = fSyncStack(`${a} ${b} +`);
    t.is(r.length, 1);
    t.true(nearly(r[0].valueOf(), a + b));
  })
);

// date addition

test(
  'should concat strings',
  check(options, ffString, ffString, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} +`);
    t.is(r.length, 1);
    t.is(r[0], a.valueOf() + b.valueOf());
  })
);

/* SUB */

test(
  'should xor booleans',
  check(options, gen.boolean, gen.boolean, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} -`);
    t.is(r.length, 1);
    t.is(r[0].valueOf(), (a || b) && !(a && b));
  })
);

test(
  'should subtract numbers',
  check(options, ffNumber, ffNumber, (t, a, b, c) => {
    const r = fSyncStack(`${a} ${b} -`);
    t.is(r.length, 1);
    t.true(nearly(r[0].valueOf(), a - b));
  })
);

// date subtraction

/* MUL */

// array intersparse

// array join

test(
  'should and booleans',
  check(options, gen.boolean, gen.boolean, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} *`);
    t.is(r.length, 1);
    t.is(r[0], a && b);
  })
);

// repeat sequence

test(
  'should multiply numbers',
  check(options, ffNumber, ffNumber, (t, a, b, c) => {
    const r = fSyncStack(`${a} ${b} *`);
    t.is(r.length, 1);
    t.true(nearly(r[0].valueOf(), a * b));
  })
);

/* DIV */

test(
  'should subtract numbers',
  check(options, ffNumber, ffNumber, (t, a, b, c) => {
    const r = fSyncStack(`${a} ${b} /`);
    t.is(r.length, 1);
    t.true(nearly(r[0].valueOf(), a / b));
  })
);

test(
  'should nand booleans',
  check(options, gen.boolean, gen.boolean, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} /`);
    t.is(r.length, 1);
    t.is(r[0], !(a && b));
  })
);

/* >> */

test(
  'should unshift arrays',
  check(options, fflatValue, ffArray, (t, a, b) => {
    const r = fSyncJSON(`${a} ${b} >>`);
    t.is(r.length, 1);
    t.deepEqual(r[0], [a.toJSON(), ...b.toJSON()]);
  })
);

/* << */

test(
  'should push arrays',
  check(options, ffArray, ffBoolean, (t, a, b) => {
    const r = fSyncJSON(`${a} ${b} <<`);
    t.is(r.length, 1);
    t.deepEqual(r[0], [...a.toJSON(), b.toJSON()]);
  })
);

// choose
test(
  'should choose',
  check(options, gen.boolean, fflatValue, fflatValue, (t, a, b, c) => {
    const r = fSyncJSON(`${a} ${b} ${c} choose`);
    t.is(r.length, 1);
    t.deepEqual(r[0], a ? b.toJSON() : c.toJSON());
  })
);

/* @ */
test(
  'should get char from string',
  check(options, ffString, gen.posInt, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} @`);
    t.is(r.length, 1);
    t.is(r[0], a.valueOf()[b] || '');
  })
);

test(
  'should get value from array',
  check(options, ffArray, gen.posInt, (t, a, b) => {
    const r = fSyncJSON(`${a} ${b} @`);
    t.is(r.length, 1);
  })
);

/* ~ */
test(
  'should not booleans',
  check(options, gen.boolean, (t, a, b) => {
    const r = fSyncStack(`${a} ~`);
    t.is(r.length, 1);
    t.is(r[0], !a);
  })
);

// <-

// ->

// undo

// auto-undo

// i

// infinity

// =
test(
  'should test equality',
  check(options, fflatValue, (t, a) => {
    const r = fSyncStack(`${a} dup =`);
    t.is(r.length, 1);
    t.is(r[0], true);
  })
);

test(
  'should test equality',
  check(options, fflatValue, (t, a) => {
    // bug, should be fflatValue
    const r = fSyncStack(`${a} ${a} =`);
    t.is(r.length, 1);
    t.is(r[0], true);
  })
);

/* cmp */
test(
  'should compare numbers',
  check(options, ffNumber, ffNumber, (t, a, b) => {
    const r = fSyncStack(`${a} ${b} cmp`);
    t.is(r.length, 1);
    t.is(r[0], new Decimal(a.valueOf()).cmp(b.valueOf()));
  })
);

// memoize

// \\