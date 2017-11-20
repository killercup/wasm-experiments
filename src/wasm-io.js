const { info, trace, debug, ensure } = require("./utils");
const { TextDecoder, TextEncoder } = require("text-encoding");

/**
 * @typedef {number} Pointer A pointer into WASM memory
 */

const POINTER_WIDTH = exports.POINTER_WIDTH = 32 / 8;

/**
 * Copy C-like string
 *
 * @param  {WebAssembly.Memory}  memory
 * @param  {Pointer}  ptr
 * @return {string}
 */
exports.copyCStr = (memory, ptr) => {
  const collectCString = function*() {
    const memView = new Uint8Array(memory.buffer);
    while (memView[ptr] !== 0) {
      if (memView[ptr] === undefined) { throw new Error("Tried to read undef mem"); }
      yield memView[ptr];
      ptr += 1;
    }
  };

  const bufferAsU8 = new Uint8Array(collectCString());
  const utf8Decoder = new TextDecoder("UTF-8");
  const bufferAsUtf8 = utf8Decoder.decode(bufferAsU8);
  return bufferAsUtf8;
};

/**
 * Retrieve `[ptr, len]` from position `offset` in `memory`
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} inPointer
 * @returns {[Pointer, number]}
 */
exports.extractSlice = (memory, inPointer) => {
  /**
   * @param {Uint8Array} bytes
   */
  const iterToI32 = (bytes) => {
    const view = new DataView(bytes.buffer);
    return view.getUint32(0, true);
  };

  /**
   * @param {number} ptr
   */
  const getI32 = function(ptr) {
    return new Uint8Array(memory.buffer).slice(ptr, ptr + POINTER_WIDTH);
  };

  const outPointer = iterToI32(getI32(inPointer));
  const length = iterToI32(getI32(inPointer + POINTER_WIDTH));

  return [outPointer, length];
};

/**
 * Get Rust String
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} pointer
 * @param {number} length
 * @return {string}
 */
exports.getStr = (memory, pointer, length) => {
  /**
   * @param {Pointer} ptr
   * @param {number} len
   */
  const getData = function*(ptr, len) {
    const memView = new Uint8Array(memory.buffer);
    for (let index = 0; index < len; index++) {
      if (memView[ptr] === undefined) { throw new Error(`Tried to read undef mem at ${ptr}`); }
      yield memView[ptr + index];
    }
  };

  const bufferAsU8 = new Uint8Array(getData(pointer, length));
  const utf8Decoder = new TextDecoder("UTF-8");
  const bufferAsUtf8 = utf8Decoder.decode(bufferAsU8);
  return bufferAsUtf8;
};

/**
 * Allocate new string in WASM memory
 *
 * @param {Function} alloc
 * @param {WebAssembly.Memory} memory
 * @param {string} str
 */
exports.newString = (alloc, memory, str) => {
  ensure(typeof str === "string", `Can only allocate a string for, well, a string`);
  const memView = new Uint8Array(memory.buffer);
  const utf8Encoder = new TextEncoder("UTF-8");
  const stringBuffer = utf8Encoder.encode(str);
  const len = stringBuffer.length;
  const ptr = alloc(len + 1);

  for (let i = 0; i < len; i++) {
    memView[ptr + i] = stringBuffer[i];
  }
  memView[ptr + len] = 0;

  return ptr;
};
