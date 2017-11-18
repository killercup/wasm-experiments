const { info, trace, debug, ensure } = require('./utils')

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

  const buffer_as_u8 = new Uint8Array(collectCString())
  const buffer_from_node = new Buffer(buffer_as_u8)
  const buffer_as_utf8 = buffer_from_node.toString('utf8')
  return buffer_as_utf8
}

/**
 * Retrieve `[ptr, len]` from position `offset` in `memory`
 *
 * @param {WebAssembly.Memory} memory
 * @param {number} offset
 * @returns {[number, number]}
 */
exports.extractSlice = (memory, offset) => {
  const pointer_width = 4

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
    for (let index = 0; index < pointer_width; index++) {
      if (memView[ptr] === undefined) {
        throw new Error(`Tried to read undef mem at ${ptr}`)
      }
      yield memView[ptr + index]
    }
  }

  const ptr = iter_to_i32(getI32(offset))
  const len = iter_to_i32(getI32(offset + pointer_width))

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

  const buffer_as_u8 = new Uint8Array(getData(ptr, len));
  const buffer_from_node = new Buffer(buffer_as_u8);
  const buffer_as_utf8 = buffer_from_node.toString('utf8');
  return buffer_as_utf8;
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
  let string_buffer = Buffer.from(str, 'utf8')
  let len = string_buffer.length
  let ptr = alloc(len)

  for (let i = 0; i < len; i++) {
    memView[ptr + i] = string_buffer[i]
  }

  return ptr
}
