#!/usr/bin/env node

const { debug, info, error } = require("./src/utils");
const { instantiate } = require("./src/wasm");
const { copyCStr, extractSlice, getStr, newString } = require("./src/wasm-io");
const { wrap } = require("./src/wrap");

/**
 * Kill process when condition isn't met
 *
 * @param {boolean} condition
 * @param {string} errorMessage
 */
const ensure = (condition, errorMessage) =>
!condition && (error(errorMessage), process.exit(1));

const [nodePath, scriptName, wasmFile, fnName, ...args] = process.argv.slice();
ensure(!!wasmFile, `Usage: node ${scriptName} <path-to.wasm> [args...]`);

async function main() {
  const instance = await instantiate(wasmFile);

  if (!fnName) {
    info(`WASM file contains these exports:`, Object.keys(instance.exports));
    return;
  }

  info(`Running ${fnName} with these arguments:`, args);
  ensure(instance.exports[fnName], `No ${fnName} in WASM exports :(`);

  const { memory, alloc } = instance.exports;

  const fns = {
    add: wrap(instance.exports, "add", ["i32", "i32"], "i32"),
    hi: wrap(instance.exports, "hi", ["CStr"], "CStr"),
    time: wrap(instance.exports, "time", [], "CStr"),
  };

  ensure(fns[fnName], `${fnName} has no wrapper, don't know how to call it :(`);

  info(fns[fnName](...args));
}

main()
.catch(err => { error(err); process.exit(2); });
