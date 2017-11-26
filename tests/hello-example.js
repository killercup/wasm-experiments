const { test } = require("ava");
const { instantiate } = require("../src/wasm");
const wrap = require("../src/wrap");

test.beforeEach(async (t) => {
  t.context.i = await instantiate("./hello-wasm.wasm");
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

test(`Hello Jan-Erik`, (t) => {
  const hi = wrap(t.context.i.exports, "hi", ["CStr"], "CStr");
  t.deepEqual(hi("Jan-Erik"), "Jan-Erik");
});

test(`Hello UTF-8!`, (t) => {
  const hi = wrap(t.context.i.exports, "hi", ["CStr"], "CStr");
  t.deepEqual(hi("G̸rü͢ß ͟Got͠t͡!"), "G̸rü͢ß ͟Got͠t͡!");
});

test(`sha1`, (t) => {
  const digest = wrap(t.context.i.exports, "digest", ["CStr"], "CStr");
  t.deepEqual(digest("foobar"), "8843d7f92416211de9ebb963ff4ce28125932878");
});

test(`string slice`, (t) => {
  const time = wrap(t.context.i.exports, "time_str", [], "&str");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!!!");
});

test(`owned string`, (t) => {
  const time = wrap(t.context.i.exports, "time_string", [], "String");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!");
});

test(`slices and Vecs`, (t) => {
  const digest = wrap(t.context.i.exports, "digest_bytes", ["&[u8]"], "Vec<u8>");
  t.deepEqual(digest(new Uint8Array([0x00, 0x00, 0x00, 0x00])),
    new Uint8Array([13, 37, 42, 42]));
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
  const { newSlice, extractSlice } = require("../src/wasm-io");
  const { memory, alloc } = t.context.i.exports;
  const ptr = newSlice(memory, alloc, new Uint8Array([1, 2, 3, 4]));
  const [ptr2, len] = extractSlice(memory, ptr);
  t.deepEqual(4, len);
});
