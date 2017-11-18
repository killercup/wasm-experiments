#!/usr/bin/env node

const { debug, info, error } = require('./src/utils')
const { instantiate } = require('./src/wasm')
const { copyCStr, extractSlice, getStr, newString } = require('./src/wasm-io')
const { wrap } = require('./src/wrap')

/**
 * Kill process when condition isn't met
 *
 * @param {boolean} condition
 * @param {string} error_essage
 */
const ensure = (condition, error_essage) =>
!condition && (error(error_essage), process.exit(1))


const [_node_path, script_name, wasm_file, fn_name, ...args] = process.argv.slice()
ensure(!!wasm_file, `Usage: node ${script_name} <path-to.wasm> [args...]`)

async function main() {
  const instance = await instantiate(wasm_file)

  if (!fn_name) {
    info(`WASM file contains these exports:`, Object.keys(instance.exports))
    return
  }

  info(`Running ${fn_name} with these arguments:`, args)
  ensure(instance.exports[fn_name], `No ${fn_name} in WASM exports :(`)

  const { memory, alloc } = instance.exports

  const fns = {
    add: wrap(instance.exports, 'add', ['i32', 'i32'], 'i32'),
    time: wrap(instance.exports, 'time', [], 'CStr'),
    hi: wrap(instance.exports, 'hi', ['CStr'], 'CStr'),
  }

  ensure(fns[fn_name], `${fn_name} has no wrapper, don't know how to call it :(`)

  info(fns[fn_name](...args))

  // let wasm_call_res = 0
  // let arg = null
  // switch (fn_name) {
  //   case "hi":
  //   case "digest":
  //     arg = newString(alloc, memory, args[0])
  //     debug(fn_name, `alloc`, { arg })
  //     wasm_call_res = instance.exports[fn_name](arg)
  //     debug(fn_name, copyCStr(memory, wasm_call_res))
  //     break
  //   case "time_str":
  //     arg = alloc(8)
  //     debug(fn_name, `alloc`, { arg })
  //     wasm_call_res = instance.exports[fn_name](arg)
  //     ensure(wasm_call_res === undefined, `oh, ${fn_name} shouldn't return anything!`)
  //     let [ptr, len] = extractSlice(memory, arg)
  //     info(fn_name, `slice`, ptr, len)
  //     let str = getStr(memory, ptr, len)
  //     info(fn_name, `str`, str)
  //     break
  //   default:
  //     wasm_call_res = instance.exports[fn_name](...args)
  //     let s = copyCStr(memory, wasm_call_res);
  //     debug(fn_name, "cstr", s)
  //     break
  // }
}

main()
.catch(err => { error(err); process.exit(2) })
