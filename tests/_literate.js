// Based on https://github.com/richorama/literate
// which is Copyright 2013 Richard Astbury

const fs = require("fs");
const path = require("path");

const Module = module.constructor;

/**
 * @param {string} src
 * @param {string} filename
 * @return {any}
 *
 * @todo Fix the node-internal error this throws
 */
function requireFromString(src, filename) {
  const parent = module.parent;
  // @ts-ignore
  const paths = Module._nodeModulePaths(path.dirname(filename));

  // @ts-ignore
  const m = new Module(filename, parent);
  m.filename = filename;
  m.paths = [paths];

  m._compile(src, filename);
  const e = m.exports;

  if (parent && parent.children) {
    parent.children.splice(parent.children.indexOf(m), 1);
  }
  return e;
}

/**
 * @param {string} filename
 * @param {string} lang
 */
function parseJS(filename, lang = "js") {
  const filePath = path.resolve(filename + ".md");
  const lines = fs.readFileSync(filePath).toString().split("\n");

  /** @type {Array<string>} */
  let output = [];
  let inMd = true;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inMd && line.indexOf("```" + lang) === 0) {
      inMd = !inMd;
      output.push("");
    } else if (!inMd && line.indexOf("```") === 0) {
      inMd = !inMd;
      output.push("");
    } else {
      if (!inMd) {
        output.push(line);
      } else {
        if (line.indexOf("    ") === 0) {
          output.push(line);
        }
      }
    }
  }
  output.push("// This javascript file was auto generated.");

  // return requireFromString(output.join("\n"), filePath.toString());
  // tslint:disable-next-line:no-eval
  return eval(output.join("\n"));
}

module.exports = parseJS;
