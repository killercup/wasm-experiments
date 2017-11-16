#!/usr/bin/env node

const fs = require('fs')

const [log, info, error] = ["log", "info", "error"]
  .map((level) => (...args) => console[level](`[${level.toUpperCase()}]`, ...args))
const ensure = (test, error_essage) => !test && (error(error_essage), process.exit(1))

const [_node_path, script_name, wasm_file, fn_name, ...args] = process.argv.slice()
ensure(wasm_file, `Usage: node ${script_name} <path-to.wasm> [args...]`)

function copystr(memory, ptr) {
  let result = "";
  while (memory[ptr] != 0) {
    result += String.fromCharCode(memory[ptr]);
    ptr++;
  }
  return result;
}

function newstring(alloc, memory, str) {
  let len = str.length;
  let ptr = alloc(len);

  for (i=0; i < len; i++) {
    memory[ptr+i] = str.charCodeAt(i);
  }

  return ptr;
}

async function main(params) {
  code = fs.readFileSync(wasm_file)
  const wasm_module = await WebAssembly.compile(code.buffer)
  const instance = await new WebAssembly.Instance(wasm_module, {})

  if (!fn_name) {
    info(`WASM file contains these exports:`, Object.keys(instance.exports))
    return
  }

  info(`Running ${fn_name} with these arguments:`, args)
  ensure(instance.exports[fn_name], `No ${fn_name} in WASM exports :(`)

  var buf = new Uint8Array(instance.exports.memory.buffer);
  let wasm_call_res = 0;

  if (fn_name == "hi") {
    let arg = newstring(instance.exports.alloc, buf, args[0])
    log({arg: arg})
    wasm_call_res = instance.exports[fn_name](arg)
  } else if (fn_name == "digest") {
    let arg = newstring(instance.exports.alloc, buf, args[0])
    log({arg: arg})
    wasm_call_res = instance.exports[fn_name](arg)
  } else {
    wasm_call_res = instance.exports[fn_name](...args)
  }
  log(wasm_call_res)

  if (fn_name == "time" || fn_name == "digest") {
    let s = copystr(buf, wasm_call_res);
    log(s)
  }
}

main()
.catch(err => { error(err); process.exit(2) })
