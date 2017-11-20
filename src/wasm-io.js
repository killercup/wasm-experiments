const { info, trace, debug, ensure } = require("./utils");
const { TextDecoder, TextEncoder } = require("text-encoding");

/**
 * @typedef {number} Pointer A pointer into WASM memory
 */

const POINTER_WIDTH = exports.POINTER_WIDTH = 32 / 8;

/**
 * Retrieve `[ptr, len]` from position `offset` in `memory`
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} inPointer
 * @returns {[Pointer, number]}
 */
exports.extractSlice = function extractSlice(memory, inPointer) {
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
 * Create a slice of `[ptr, len]` from data (by allocating a buffer)
 *
 * @param {WebAssembly.Memory} memory
 * @param {Uint8Array} data
 * @param {(length: number) => Pointer} alloc
 * @returns {Pointer} Pointer to `[Pointer, number]` pair
 */
exports.newSlice = function newSlice(memory, alloc, data) {
  const memView = new Uint8Array(memory.buffer);
  const sliceData = alloc(data.length);
  const len = data.length;

  for (let i = 0; i < len; i++) {
    memView[sliceData + i] = data[i];
  }

  const ptr = alloc(2 * POINTER_WIDTH);
  memView[ptr] = sliceData;
  memView[ptr + 1] = len;

  return ptr;
};

/**
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} pointer
 * @param {number} length
 * @return {Uint8Array}
 */
exports.getSliceData = function getSliceData(memory, pointer, length) {
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

  return new Uint8Array(getData(pointer, length));
};

/**
 * Get Rust String
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} pointer
 * @param {number} length
 * @return {string}
 */
exports.getStr = function getStr(memory, pointer, length) {
  const bufferAsU8 = exports.getSliceData(memory, pointer, length);
  const utf8Decoder = new TextDecoder("UTF-8");
  const bufferAsUtf8 = utf8Decoder.decode(bufferAsU8);
  return bufferAsUtf8;
};
