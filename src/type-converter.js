const { ensure, unimplemented } = require("./utils");
const { newF32Slice, newSlice, newU16Slice, extractSlice, extractVectorSlice, getStr, POINTER_WIDTH } = require("./wasm-io");
const { TextDecoder, TextEncoder } = require("text-encoding");

/**
 * @typedef {number} Pointer A pointer into WASM memory
 */

/**
 * Convert Rust/WASM <-> JS types
 */
const typeConversions = {
  "&[u8]": {
    /**
     * Copy &[u8] arguments into shared memory before passing to Rust
     *
     * @param {Uint8Array} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      ensure(data instanceof Uint8Array, "Can only use `Uint8Array` as `&[u8]`");

      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      return newSlice(memory, alloc, data);
    },
    /**
     * Copy &[u8] return values from shared memory on return from Rust
     *
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {Uint8Array}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      const [ptr, len] = extractSlice(memory, data);
      return new Uint8Array(memory.buffer, ptr, len);
    },
    /**
     * Allocate memory for mutable return parameters; used before calling Rust
     *
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(2 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "&str": {
    /**
     * @param {string} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      ensure(typeof data === "string", "Can only use `Uint8Array` as `&[u8]`");

      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const utf8Encoder = new TextEncoder("UTF-8");
      const stringBuffer = utf8Encoder.encode(data);

      return newSlice(memory, alloc, stringBuffer);
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {string}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      const [ptr, len] = extractSlice(memory, data);
      return getStr(memory, ptr, len);
    },
    /**
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(2 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "()": {
    simpleReturn: true,
    /**
     * @param {any} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      unimplemented("Unit type `()` in fn argument position");
    },
    /**
     * @param {any} data
     * @param {WebAssembly.Module} exports
     */
    ret(data, exports) {
      return data;
    },
  },
  "CStr": {
    /**
     * @param {string} data
     * @param {WebAssembly.Module} exports
     * @returns {Pointer}
     */
    arg(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to pass strings to WASM");
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      ensure(typeof data === "string", "Can only allocate a string for, well, a string");

      const utf8Encoder = new TextEncoder("UTF-8");
      const stringBuffer = utf8Encoder.encode(data);
      const len = stringBuffer.length;
      const ptr = alloc(len + 1);
      const memView = new Uint8Array(memory.buffer);

      for (let i = 0; i < len; i++) {
        memView[ptr + i] = stringBuffer[i];
      }
      memView[ptr + len] = 0;

      return ptr;
    },
    /**
     * @param {Pointer} ptr
     * @param {WebAssembly.Module} exports
     * @returns {string}
     */
    ret(ptr, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");

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
    },
  },
  "String": {
    /**
     * @param {number} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      unimplemented();
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {string}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      // Actually, just read it like a slice, we copy it anyway, so the capacity doesn't matter
      const [ptr, len] = extractSlice(memory, data);
      return getStr(memory, ptr, len);
    },
    /**
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(3 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "Vec<f32>": {
    /**
     * @param {Float32Array} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      ensure(data instanceof Float32Array, "Can only use `Float32Array` as `Vec<f32>`");

      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      return newF32Slice(memory, alloc, data);
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {Float32Array}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      // Actually, just read it like a slice, we copy it anyway, so the capacity doesn't matter
      const [ptr, len] = extractVectorSlice(memory, data);
      return new Float32Array(memory.buffer, ptr, len);
    },
    /**
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(3 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "Vec<u16>": {
    /**
     * @param {Uint16Array} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      ensure(data instanceof Uint16Array, "Can only use `Uint16Array` as `&[u16]`");

      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      return newU16Slice(memory, alloc, data);
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {Uint16Array}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      // Actually, just read it like a slice, we copy it anyway, so the capacity doesn't matter
      const [ptr, len] = extractVectorSlice(memory, data);
      return new Uint16Array(memory.buffer, ptr, len);
    },
    /**
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(3 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "Vec<u8>": {
    /**
     * @param {Uint8Array} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      ensure(data instanceof Uint8Array, "Can only use `Uint8Array` as `&[u8]`");

      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      return newSlice(memory, alloc, data);
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @return {Uint8Array}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      // Actually, just read it like a slice, we copy it anyway, so the capacity doesn't matter
      const [ptr, len] = extractVectorSlice(memory, data);
      return new Uint8Array(memory.buffer, ptr, len);
    },
    /**
     * @param {Array<any>} args
     * @param {WebAssembly.Module} exports
     * @return {Pointer}
     */
    outParam(args, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to get strings from WASM");
      ensure(memory, "You need to export the main memory to get strings from WASM");

      const ptr = alloc(3 * POINTER_WIDTH);
      args.unshift(ptr);
      return ptr;
    },
  },
  "bool": {
    simpleReturn: true,
    /**
     * @param {boolean} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) {
      return data ? 1 : 0;
    },
    /**
     * @param {any} data
     * @param {WebAssembly.Module} exports
     */
    ret(data, exports) {
      return data === 1;
    },
  },
  "i32": {
    simpleArg: true,
    simpleReturn: true,
    /**
     * @param {number} data
     * @param {WebAssembly.Module} exports
     * @return {number}
     */
    arg(data, exports) {
      return data;
    },
    /**
     * @param {number} data
     * @param {WebAssembly.Module} exports
     * @return {number}
     */
    ret(data, exports) {
      return data;
    },
  },
};

exports.typeConversions = typeConversions;
