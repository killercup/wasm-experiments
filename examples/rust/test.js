const { instantiate } = require("../../src/wasm");
const wrap = require("../../src/wrap");

async function sampleTime() {
  const context = await instantiate("./hello-wasm.wasm");
  const time = wrap(context.exports, "time", [], "CStr");
  time(); // "Es ist fünf vor Zwölf!!"
}

async function sampleAdd() {
  const context = await instantiate("./hello-wasm.wasm");
  const add = wrap(context.exports, "add", ["i32", "i32"], "i32");
  add(2, 2); //42
  add(1.1, 1.1); //42
}

async function sampleEcho() {
  const context = await instantiate("./hello-wasm.wasm");
  const echo = wrap(context.exports, "echo_str", ["&str"], "&str");
  echo("Banana") // "Banana"
  echo("Apple") // "Apple"
  echo(""); // ""
  echo("L͞o̕r̕em͟ ip̕s͏u͢m");  // "L͞o̕r̕em͟ ip̕s͏u͢m"
}

async function sampleIsFancy() {
  const context = await instantiate("./hello-wasm.wasm");
  const isFancy = wrap(context.exports, "is_fancy", ["&str", "bool"], "bool");
  isFancy("Banana", true); //true
  isFancy("Apple", false); //false
  isFancy("N/A", true); // false
}

async function sampleAlloc() {
  const context = await instantiate("./hello-wasm.wasm");
  const { newSlice, extractSlice } = require("../../src/wasm-io");
  const { memory, alloc } = context.exports;
  const ptr = newSlice(memory, alloc, new Uint8Array([1, 2, 3, 4]));
  const [ptr2, len] = extractSlice(memory, ptr);
  // len is 4
}
