const fs = require("fs");

/**
 * @param {string} wasmFile
 * @param {object} imports
 */
exports.instantiate = async (wasmFile, imports = {}) => {
  const code = fs.readFileSync(wasmFile);
  const wasmModule = await WebAssembly.compile(Buffer.from(code));
  const instance = await new WebAssembly.Instance(wasmModule, imports);
  return instance;
};
