const { ensure, unimplemented } = require("./utils");
const { newString, copyCStr } = require("./wasm-io");

/**
 * @typedef {number} Pointer A pointer into WASM memory
 */

/**
 * Convert Rust/WASM <-> JS types
 */
const typeConversions = {
  "&str": {
    /**
     * @param {any} data
     * @param {WebAssembly.Module} exports
     */
    arg(data, exports) { unimplemented(); },
    /**
     * @param {any} data
     * @param {WebAssembly.Module} exports
     */
    ret(data, exports) { unimplemented(); },
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
     */
    arg(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports;
      ensure(alloc, "You need to export an `alloc` function to pass strings to WASM");
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      return newString(alloc, memory, data);
    },
    /**
     * @param {Pointer} data
     * @param {WebAssembly.Module} exports
     * @returns {string}
     */
    ret(data, exports) {
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports;
      ensure(memory, "You need to export the main memory to pass strings to WASM");
      return copyCStr(memory, data);
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
