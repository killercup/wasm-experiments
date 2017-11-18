/**
 * @param {string} level
 */
const makeLogger = (level) =>
  // @ts-ignore
  (...args) => console[level](`[${level.toUpperCase()}]`, ...args)

exports.log = makeLogger('log')
exports.info = makeLogger('info')
exports.warn = makeLogger('warn')
exports.error = makeLogger('error')

/**
 * @param {boolean} test
 * @param {string} error_essage
 */
exports.ensure = (test, error_essage) =>
  !test && (exports.error(error_essage), process.exit(1))
