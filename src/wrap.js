/**
 * Wrap WASM function
 *
 * @param   {WebAssembly.Module}  exports  WASM exports
 * @param   {string}  fnIdent  Function name
 * @param   {Array<'I32' | 'string' | 'void'>}  args  Function arguments
 * @param   {'I32' | 'string' | 'void'}  returns  Return value
 * @returns {Function}
 *
 * @example
 * wrap(instance.exports)
 */
exports.wrap = function wrap(exports, fnIdent, args = [], returns = 'void') {
  // Shortcut: I32 -> I32
  const simpleArgs = args.every((arg) => arg === 'I32')
  const simpleReturn = returns === 'void' || returns === 'I32'
  if (simpleArgs && simpleReturn) {
    // @ts-ignore
    return exports[fnIdent]
  }

  throw new Error("unimplemented")
}