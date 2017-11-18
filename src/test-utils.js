const { log, error, ensure } = require('./utils')
const { instantiate } = require('./wasm')

/**
 * @param {Function} fn
 */
const callAsPromise = (fn) => {
  try {
    let res = fn()
    if (res instanceof Promise) {
      return res
    }
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

/**
 * @param {string} name
 * @param {Function} fn
 */
exports.test = function test(name, fn) {
  if (!fn) { return console.info(`[PENDING]`, name) }
  ensure(typeof fn === 'function', `test ${name} requires function as second argument`)
  
  callAsPromise(fn)
  .then((res) => console.log("[PASS]", name))
  .catch((err) => error(name, err))
}
