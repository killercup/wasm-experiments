const fs = require('fs')

/**
 * @param {string} wasm_file
 * @param {object} imports
 */
exports.instantiate = async (wasm_file, imports = {}) => {
  const code = fs.readFileSync(wasm_file)
  const wasm_module = await WebAssembly.compile(Buffer.from(code))
  const instance = await new WebAssembly.Instance(wasm_module, imports)
  return instance
}
