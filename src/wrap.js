const { ensure } = require('./utils')
const { newString, copyCStr } = require('./wasm-io')

/**
 * Convert JS -> WASM types
 *
 * @param  {'i32' | 'CStr'}  type  Argument type
 * @param  {*}  data  Argument data
 * @param  {WebAssembly.Module}  exports  WASM exports for helper methods
 * @return {*}
 */
function convertArg(type, data, exports) {
  switch (type) {
    case 'i32':
      return data
    case "CStr":
      // @ts-ignore -- yes accessing these exports works
      const { alloc, memory } = exports
      ensure(alloc, "You need to export an `alloc` function to pass strings to WASM")
      ensure(memory, "You need to export the main memory to pass strings to WASM")
      return newString(alloc, memory, data)
    default:
      throw new Error(`Cannot convert ${type} to something I can pass to WASM`)
  }
}

/**
 * Convert JS -> WASM types
 *
 * @param  {'i32' | 'CStr' | '()'}  type  Return type
 * @param  {*}  data  Return data
 * @param  {WebAssembly.Module}  exports  WASM exports for helper methods
 * @return {*}
 */
function convertReturn(type, data, exports) {
  switch (type) {
    case '()':
    case 'i32':
      return data
    case "CStr":
      // @ts-ignore -- yes accessing these exports works
      const { memory } = exports
      ensure(memory, "You need to export the main memory to pass strings to WASM")
      return copyCStr(memory, data)
    default:
      throw new Error(`Cannot convert ${type} to something I can pass to WASM`)
  }
}

/**
 * Wrap WASM function
 *
 * @param  {WebAssembly.Module}  exports  WASM exports
 * @param  {string}  fnIdent  Function name
 * @param  {Array<'i32' | 'CStr'>}  argTypes  Function arguments
 * @param  {'i32' | 'CStr' | '()'}  returnType  Return type
 * @return {Function}
 *
 * @example
 * const add = wrap(instance.exports, 'add', ['i32', 'i32'], 'i32')
 * const time = wrap(instance.exports, 'time', [], 'CStr')
 * const hi = wrap(instance.exports, 'time', ['CStr'], 'CStr')
 *
 * @todo Add `deallocList` or something like that to free memory
 */
exports.wrap = function wrap(exports, fnIdent, argTypes = [], returnType = '()') {
  // @ts-ignore -- Indexing a WASM module actually works
  const fn = exports[fnIdent]
  ensure(fn, `WASM module doesn't export a ${fnIdent} function`)

  // Shortcut: I32 -> I32
  const simpleArgs = argTypes.every((arg) => arg === 'i32')
  const simpleReturn = returnType === '()' || returnType === 'i32'
  if (simpleArgs && simpleReturn) {
    return fn
  }

  // @ts-ignore -- this is an arbitrary fn, the signture is checked at runtime
  return (...args) => {
    ensure(args.length === argTypes.length, `${fnIdent} takes ${argTypes.length} ` +
      `arguments, ${args.length} given`)

    const transformedArgs = argTypes
      .map((type, index) => convertArg(type, args[index], exports))

    const res = fn(...transformedArgs)
    return convertReturn(returnType, res, exports)
  }
}
