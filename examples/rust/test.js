const { test } = require("ava");
const { instantiate } = require("../../src/wasm");
const wrap = require("../../src/wrap");

test.beforeEach(async (t) => {
  t.context.i = await instantiate("examples/rust/demo.wasm");
});

test(`It's WASM time`, (t) => {
  const time = wrap(t.context.i.exports, "time", [], "CStr");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!!");
});

test(`2 + 2 = 42`, (t) => {
  const add = wrap(t.context.i.exports, "add", ["i32", "i32"], "i32");
  t.deepEqual(add(2, 2), 42);
  t.deepEqual(add(1.1, 1.1), 42);
});

test(`str echo`, (t) => {
  const echo = wrap(t.context.i.exports, "echo_str", ["&str"], "&str");
  t.deepEqual(echo("Banana"), "Banana");
  t.deepEqual(echo("Apple"), "Apple");
  t.deepEqual(echo(""), "");
  t.deepEqual(echo("L͞o̕r̕em͟ ip̕s͏u͢m"), "L͞o̕r̕em͟ ip̕s͏u͢m");
});

test(`boolean`, (t) => {
  const isFancy = wrap(t.context.i.exports, "is_fancy", ["&str", "bool"], "bool");
  t.deepEqual(isFancy("Banana", true), true);
  t.deepEqual(isFancy("Apple", false), false);
  t.deepEqual(isFancy("N/A", true), false);
});

test(`slice roundtrip`, (t) => {
  const { newSlice, extractSlice } = require("../../src/wasm-io");
  const { memory, alloc } = t.context.i.exports;
  const ptr = newSlice(memory, alloc, new Uint8Array([1, 2, 3, 4]));
  const [ptr2, len] = extractSlice(memory, ptr);
  t.deepEqual(4, len);
});
