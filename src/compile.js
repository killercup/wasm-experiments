/**
 * Test helpers to read Rust and output WASM
 */

const tmp = require("tmp");
const { promisify } = require("util");
const childProcess = require("child_process");
const fs = require("fs");
const { join } = require("path");

const { debug } = require("./utils");
const { instantiate } = require("../src/wasm");

const exec = promisify(childProcess.exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

function createTmpDir(opts = {}) {
  return new Promise((resolve, reject) => {
    tmp.dir(opts, (err, path, cleanupCallback) => {
      if (err) { return reject(err); }
      resolve({
        cleanupCallback,
        /**
         * @param {string} name
         * @param {string} data
         * @return {Promise<{ filePath: string, data: string }>}
         */
        createFile(name, data) {
          const filePath = join(path, name);
          return writeFile(filePath, data)
            .then(() => ({ filePath, data }));
        },
        path,
      });
    });
  });
}

/**
 * @param {string} rustSource
 * @return {Promise<Buffer>} WASM source
 */
async function rustToWasm(rustSource) {
  const tmpDir = await createTmpDir({ unsafeCleanup: true });
  try {
    debug("creating rust project in", tmpDir.path);
    const binaryName = "bar";
    await tmpDir.createFile("Cargo.toml", `
      [package]
      name = "foo"
      version = "0.1.0"

      [[bin]]
      name = "${binaryName}"
      path = "main.rs"
    `);

    await tmpDir.createFile("main.rs",
      `// auto-generated

      fn main() {}

      ${rustSource}
    `);

    debug("compiling rust project...");
    await exec(
      "cargo +nightly build --target=wasm32-unknown-unknown --release",
      { cwd: tmpDir.path },
    );

    debug("compiling done. reading WASM file");
    const wasm = await readFile(
      join(tmpDir.path, "target", "wasm32-unknown-unknown", "release", `${binaryName}.wasm`),
    );

    return wasm;
  } catch (error) {
    throw error;
  } finally {
    tmpDir.cleanupCallback();
  }
}

/**
 *
 * @param {string} rustSource
 * @param {object} imports
 */
module.exports = async function loadRust(rustSource, imports = {}) {
  const wasm = await rustToWasm(rustSource);
  const wasmModule = await WebAssembly.compile(wasm);
  const instance = await new WebAssembly.Instance(wasmModule, imports);
  return instance;
};
