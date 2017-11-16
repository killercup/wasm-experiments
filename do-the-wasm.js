#!/usr/bin/env node

const fs = require('fs')

const [log, info, error] = ["log", "info", "error"]
  .map((level) => (...args) => console[level](`[${level.toUpperCase()}]`, ...args))
const ensure = (test, error_essage) => !test && (error(error_essage), process.exit(1))

const [_node_path, script_name, wasm_file, fn_name, ...args] = process.argv.slice()
ensure(wasm_file, `Usage: node ${script_name} <path-to.wasm> [args...]`)

function copyCStr(memory, ptr) {
  const collectCString = function* () { 
    while (memory[ptr] !== 0) {
      if (memory[ptr] === undefined) { throw new Error("Tried to read undef mem") }
      yield memory[ptr]
      ptr += 1
    }
  }

  const buffer_as_u8 = new Uint8Array(collectCString())
  const buffer_from_node = Buffer.from(buffer_as_u8)
  const buffer_as_utf8 = buffer_from_node.toString('utf8')
  return buffer_as_utf8
}

/// Retrieve `[ptr, len]` from position `offset` in `memory`
function extractSlice(memory, offset) {
  const pointer_width = 4
  
  const iter_to_i32 = (iter) => {
    const bytes = new Uint8Array(iter)
    const view = new DataView(bytes.buffer)
    return view.getUint32()
  }

  const getI32 = function* (ptr) {
    for (let index = 0; index < pointer_width; index++) {
      if (memory[ptr] === undefined) {
        debugger
        throw new Error(`Tried to read undef mem at ${ptr}`)
      }
      yield memory[ptr + index]
    }
  }

  const ptr = iter_to_i32(getI32(offset/8))
  const len = iter_to_i32(getI32(offset/8 + pointer_width))

  return [ptr, len]
}

function getStr(memory, ptr, len) {
  const getData = function* (ptr, len) {
    for (let index = 0; index < len; index++) {
      if (memory[ptr] === undefined) { throw new Error(`Tried to read undef mem at ${ptr}`) }
      yield memory[ptr + index]
    }
  }
  
  const buffer_as_u8 = new Uint8Array(getData(ptr/8, len/8));
  const buffer_from_node = Buffer.from(buffer_as_u8);
  const buffer_as_utf8 = buffer_from_node.toString('utf8');
  return buffer_as_utf8;
}

function newstring(alloc, memory, str) {
  info(typeof str)
  let string_buffer = Buffer.from(str, 'utf8')
  let len = string_buffer.length
  let ptr = alloc(len)

  for (i = 0; i < len; i++) {
    memory[ptr+i] = string_buffer[i]
  }

  return ptr
}

async function instantiate(imports = {}) {
  const code = fs.readFileSync(wasm_file)
  const wasm_module = await WebAssembly.compile(code.buffer)
  const instance = await new WebAssembly.Instance(wasm_module, imports)
  return instance
}

async function main(params) {
  const instance = await instantiate()

  if (!fn_name) {
    info(`WASM file contains these exports:`, Object.keys(instance.exports))
    return
  }

  info(`Running ${fn_name} with these arguments:`, args)
  ensure(instance.exports[fn_name], `No ${fn_name} in WASM exports :(`)

  const { memory, alloc } = instance.exports
  var buf = new Uint8Array(memory.buffer)
  let wasm_call_res = 0
  let arg = null
  
  switch (fn_name) {
    case "hi":
    case "digest":
      arg = newstring(alloc, buf, args[0])
      log(fn_name, `alloc`, { arg })
      wasm_call_res = instance.exports[fn_name](arg)
      log(fn_name, copyCStr(buf, wasm_call_res))
      break
    case "time_str":
      arg = alloc(8)
      log(fn_name, `alloc`, { arg })
      wasm_call_res = instance.exports[fn_name](arg)
      ensure(wasm_call_res === undefined, `oh, ${fn_name} shouldn't return anything!`)
      let [ptr, len] = extractSlice(buf, arg)
      info(fn_name, `slice`, ptr, len)
      let str = getStr(buf, ptr, len)
      info(fn_name, `str`, str)
      break
    default:
      wasm_call_res = instance.exports[fn_name](...args)
      let s = copyCStr(buf, wasm_call_res);
      log(fn_name, "cstr", s)
      break
  }
}

main()
.catch(err => { error(err); process.exit(2) })

module.exports = {
  instantiate,
  log, info, error, ensure,
}
