#!/usr/bin/env node

const fs = require('fs')

const [log, info, error] = ["log", "info", "error"]
  .map((level) => (...args) => console[level](`[${level.toUpperCase()}]`, ...args))
const ensure = (test, error_essage) => !test && (error(error_essage), process.exit(1))

const [_node_path, script_name, wasm_file, fn_name, ...args] = process.argv.slice()
ensure(wasm_file, `Usage: node ${script_name} <path-to.wasm> [args...]`)

async function main(params) {
  code = fs.readFileSync(wasm_file)
  const wasm_module = await WebAssembly.compile(code.buffer)
  const instance = await new WebAssembly.Instance(wasm_module, {})

  info(`WASM file contains these exports:`, Object.keys(instance.exports))
  if (!fn_name) { return }

  info(`Running ${fn_name} with these arguments:`, args)
  ensure(instance.exports[fn_name], `No ${fn_name} in WASM exports :(`)
  
  const wasm_call_res = instance.exports[fn_name](...args)
  log(wasm_call_res)
}

main()
.catch(err => { error(err); process.exit(2) })
