const {construct, trim, pipe, chain, join, concat, map, match, toString, split, sortBy, sequence} = require('ramda')
const Task = require("data.task")
const babel = require("babel-core")
const {read} = require('io.filesystem')(require('fs'))
const {exec, stdout} = require('./io.system')
const File = require('./File')

const babel_plugins = [
  require('babel-plugin-transform-es2015-modules-commonjs'),
]

/// transform("import 'x'") -> "'use strict';\n\nrequire('x');"
const transform = txt =>
  babel.transform(txt, {plugins: babel_plugins}).code

/// capture(/a(.)z/g)("aaz abz acz") -> [["a"], ["b"], ["c"]]
/// capture(/a(.)z/)("aaz abz") -> [["a"]]
const capture = rx => str => {
  let m, ms = []
  while (m = rx.exec(str)) {
    ms.push(m.slice(1))
    if (!rx.global) break
  }
  return ms
}

const trace = label => x =>
  (console.log(`[TRACE] ${label}:`, x), x)

const color = n => s =>
  `\u001b[${n}m${s}\u001b[0m`

/// red("hi") -> `\u001b[31mhi\u001b[0m`
const red = color(31)
const green = color(32)
const yellow = color(33)

const runFile = file =>
  new Task((rej, res) => {
    try {
      eval(file.body)
      res(file)
    } catch (error) {
      rej({
        file,
        error,
        message: error.message,
      })
    }
  })

const readFile = name =>
  map(File(name), read({}, name))

/// strLit('x') -> '"x"'
/// strLit('"x"') -> '"\\"x\\""'
const strLit = x =>
  `"${x.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

const captureCases = capture(/\/\/\/ +(.+) +-> +(.+)/g)

const asAssert = ([input, output]) =>
  ` process.stdout.write(${strLit("  " + input + " -> " + output)});
    _premunition_assert.deepStrictEqual(${input}, ${output});
    console.log(${strLit(green(" +"))});
  `

const extractAsserts =
  pipe(
    captureCases,
    map(asAssert),
  )

const appendAsserts = file =>
  file.append(
    ` const _premunition_assert = require('assert');
      console.log("\\n", ${strLit(file.name + ":")});
      ${extractAsserts(file.body).join('\n')}
    `)

const testFile =
  pipe(
    appendAsserts,
    map(transform),
    runFile,
  )

const $_failure = ({name, error, message}) => {
  console.log(red(' FAIL') + "\n\n" + red("  result:"), error.actual, yellow("\nexpected:"), green(error.expected))
}

const $_success = () => {}

const $_error = trace("ERROR")

const test = _args =>
  exec({}, `ag -lG js "^ *///(.*->)"`)
  .map(pipe(
    stdout,
    trim,
    split(/\s+/gm),
    sortBy(toString), //-> List Filename
  ))
  .orElse(_ => Task.of([]))
  .chain(pipe(
    map(readFile), //-> List (Task File)
    map(chain(testFile)),
    sequence(Task.of), //-> Task (List File)
  ))
  .fork($_failure, $_success)

module.exports = test
