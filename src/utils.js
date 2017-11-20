if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = "2";
}

/**
 * @param {string} name
 * @param {number} level
 */
function makeLogger(name, level) {
  if ((process.env.LOG_LEVEL || 2) < level) {
    // @ts-ignore
    // tslint:disable-next-line:no-empty
    return (...args) => { };
  }
  // @ts-ignore
  return (...args) => console[name](`[${name.toUpperCase()}]`, ...args);
}

exports.error = makeLogger("error", 0);
exports.warn = makeLogger("warn", 1);
exports.info = makeLogger("info", 2);
exports.debug = makeLogger("log", 3);
exports.trace = makeLogger("trace", 4);

class EnsureError extends Error {
  constructor(message = "") {
    super("Ensure failed" + (message.length ? ": " + message : ""));
  }
}

/**
 * @param {boolean} condition
 * @param {string} errorMsg
 */
exports.ensure = (condition, errorMsg) => {
  if (condition) { return; } else { throw new EnsureError(errorMsg); }
};

class UnimplementedError extends Error {
  constructor(message = "") {
    super("Unimplemented" + (message.length ? ": " + message : ""));
  }
}

exports.unimplemented = function unimplemented(message = "") {
  throw new UnimplementedError(message);
};
