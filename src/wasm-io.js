const { info, trace, debug, ensure } = require('./utils')
const { TextDecoder, TextEncoder } = require('text-encoding')

/**
 * Copy C-like string
 *
 * @param  {WebAssembly.Memory}  memory
 * @param  {number}  ptr
 * @return {string}
 */
exports.copyCStr = (memory, ptr) => {
  const collectCString = function* () {
    const memView = new Uint8Array(memory.buffer);
    while (memView[ptr] !== 0) {
      if (memView[ptr] === undefined) { throw new Error("Tried to read undef mem") }
      yield memView[ptr]
      ptr += 1
    }
  }

  const bufferAsU8 = new Uint8Array(collectCString())
  const utf8Decoder = new TextDecoder("UTF-8")
  const bufferAsUtf8 = utf8Decoder.decode(bufferAsU8)
  return bufferAsUtf8
}

/**
 * Retrieve `[ptr, len]` from position `offset` in `memory`
 *
 * @param {WebAssembly.Memory} memory
 * @param {number} offset
 * @returns {[number, number]}
 */
exports.extractSlice = (memory, offset) => {
  const pointerWidth = 4

  /**
   * @param {Iterable<number>} iter
   */
  const iter_to_i32 = (iter) => {
    const bytes = new Uint8Array(iter)
    const view = new DataView(bytes.buffer)
    return view.getUint32(0)
  }

  /**
   * @param {number} ptr
   */
  const getI32 = function* (ptr) {
    const memView = new Uint8Array(memory.buffer);
    for (let index = 0; index < pointerWidth; index++) {
      if (memView[ptr] === undefined) {
        throw new Error(`Tried to read undef mem at ${ptr}`)
      }
      yield memView[ptr + index]
    }
  }

  const ptr = iter_to_i32(getI32(offset))
  const len = iter_to_i32(getI32(offset + pointerWidth))

  return [ptr, len]
}

/**
 * Get Rust String
 *
 * @param {WebAssembly.Memory} memory
 * @param {number} ptr
 * @param {number} len
 * @return {string}
 */
exports.getStr = (memory, ptr, len) => {
  /**
   * @param {number} ptr
   * @param {number} len
   */
  const getData = function* (ptr, len) {
    const memView = new Uint8Array(memory.buffer);
    for (let index = 0; index < len; index++) {
      if (memView[ptr] === undefined) { throw new Error(`Tried to read undef mem at ${ptr}`) }
      yield memView[ptr + index]
    }
  }

  const bufferAsU8 = new Uint8Array(getData(ptr, len));
  const utf8Decoder = new TextDecoder("UTF-8");
  const bufferAsUtf8 = utf8Decoder.decode(bufferAsU8);
  return bufferAsUtf8;
}

/**
 * Allocate new string in WASM memory
 *
 * @param {Function} alloc
 * @param {WebAssembly.Memory} memory
 * @param {string} str
 */
exports.newString = (alloc, memory, str) => {
  ensure(typeof str === 'string', `Can only allocate a string for, well, a string`)
  const memView = new Uint8Array(memory.buffer);
  const utf8Encoder = new TextEncoder("UTF-8")
  const stringBuffer = utf8Encoder.encode(str)
  const len = stringBuffer.length
  const ptr = alloc(len)

  for (let i = 0; i < len; i++) {
    memView[ptr + i] = stringBuffer[i]
  }

  return ptr
}
