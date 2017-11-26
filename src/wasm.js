const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

/**
 * @param {string} wasmFile
 * @param {object} imports
 */
exports.instantiate = async (wasmFile, imports = {}) => {
  const code = await readFile(wasmFile);
  const wasmModule = await WebAssembly.compile(Buffer.from(code));
  const instance = await new WebAssembly.Instance(wasmModule, imports);
  return instance;
};
