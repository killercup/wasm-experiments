/**
 * Test helpers to read Rust and output WASM
 *
 * @typedef {string} Version
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
 * Compile Rust source code to WASM
 *
 * @param {string} rustSource
 * @param {{[name: string]: Version}} dependencies A map of dependencies,
 *   e.g., `{ sha1: "0.2" }`
 * @return {Promise<Buffer>} WASM source
 */
async function rustToWasm(rustSource, dependencies = {}) {
  const tmpDir = await createTmpDir({ unsafeCleanup: true });
  try {
    debug("creating rust project in", tmpDir.path);
    const moduleName = "bar";
    debug(dependencies);
    const dependenciesToml = Object.keys(dependencies)
      .map((dep) => `"${dep}" = "${dependencies[dep]}"`);

    const cargoToml = `
      [package]
      name = "${moduleName}"
      version = "0.1.0"

      [lib]
      path = "lib.rs"
      crate-type = ["cdylib"]

      [dependencies]
      ${dependenciesToml}

      [profile.release]
      opt-level = "s"
    `;
    debug("Cargo.toml", cargoToml);
    await tmpDir.createFile("Cargo.toml", cargoToml);

    await tmpDir.createFile("lib.rs",
      `// auto-generated

      ${rustSource}
    `);

    debug("compiling rust project...");
    await exec(
      "cargo +nightly build --target=wasm32-unknown-unknown --release",
      { cwd: tmpDir.path },
    );

    debug("compiling done. reading WASM file");
    const wasm = await readFile(
      join(tmpDir.path, "target", "wasm32-unknown-unknown", "release", `${moduleName}.wasm`),
    );

    return wasm;
  } catch (error) {
    throw error;
  } finally {
    tmpDir.cleanupCallback();
  }
}

/**
 * Compile Rust source code and load the WASM
 *
 * @param {string} rustSource
 * @param {{[name: string]: Version}} dependencies A map of dependencies,
 *   e.g., `{ sha1: "0.2" }`
 * @param {object} imports
 * @return {Promise<WebAssembly.Instance>}
 */
module.exports = async function loadRust(
  rustSource,
  dependencies = {},
  imports = {},
) {
  const wasm = await rustToWasm(rustSource, dependencies);
  const wasmModule = await WebAssembly.compile(wasm);
  const instance = await new WebAssembly.Instance(wasmModule, imports);
  return instance;
};
