const { ensure, unimplemented } = require("./utils");
const { typeConversions } = require("./type-converter");

/**
 * Wrap WASM function
 *
 * @typedef {keyof typeof typeConversions} RustType
 * @param  {WebAssembly.Module}  exports  WASM exports
 * @param  {string}  fnIdent  Function name
 * @param  {Array<RustType>}  argTypes  Function arguments
 * @param  {RustType}  returnType  Return type
 * @return {Function}
 *
 * @todo `RustType` is currently a `string`, but should be somethine like `"i32" | "CStr"`
 *
 * @example
 * const add = wrap(instance.exports, 'add', ['i32', 'i32'], 'i32')
 * const time = wrap(instance.exports, 'time', [], 'CStr')
 * const hi = wrap(instance.exports, 'time', ['CStr'], 'CStr')
 *
 * @todo Add `deallocList` or something like that to free memory
 */
exports.wrap = function wrap(exports, fnIdent, argTypes = [], returnType = "()") {
  // @ts-ignore -- Indexing a WASM module actually works
  const fn = exports[fnIdent];

  ensure(fn, `WASM module doesn't export a ${fnIdent} function`);
  ensure(typeConversions[returnType], `No support for ${returnType}`);
  argTypes.forEach((arg) => ensure(typeConversions[arg], `No support for ${arg}`));

  // Shortcut: No conversion necessary
  const simpleArgs = argTypes.every((arg) => typeConversions[arg].simpleArgs) || false;
  const simpleReturn = typeConversions[returnType].simpleReturn || false;
  if (simpleArgs && simpleReturn) {
    return fn;
  }

  // @ts-ignore -- this is an arbitrary fn, the signture is checked at runtime
  return (...args) => {
    ensure(args.length === argTypes.length, `${fnIdent} takes ${argTypes.length} ` +
      `arguments, ${args.length} given`);

    const transformedArgs = argTypes
      .map((type, index) => typeConversions[type].arg(args[index], exports));

    let outParam;
    if (typeof typeConversions[returnType].outParam === "function") {
      outParam = typeConversions[returnType].outParam(transformedArgs, exports);
    }

    const res = fn(...transformedArgs);
    return typeConversions[returnType].ret(outParam || res, exports);
  };
};
