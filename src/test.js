const {trim, pipe, chain, join, concat, map, match, toString, split, sortBy, sequence} = require('ramda')
const Task = require("data.task")
const babel = require("babel-core")
const {read} = require('io.filesystem')(require('fs'))
const {exec, stdout} = require('./io.system')

const babel_plugins = [
  require('babel-plugin-transform-es2015-modules-commonjs'),
]

const transform = txt =>
  babel.transform(txt, {plugins: babel_plugins}).code

const transformCode = ([name, txt]) =>
  [name, transform(txt)]

const trace = label => x =>
  (console.log(`[TRACE] ${label}:`, x), x)

const color = n => s =>
  `\u001b[${n}m${s}\u001b[0m`

/// red("hi") -> `\u001b[31mhi\u001b[0m`
const red = color(31)
const green = color(32)
const yellow = color(33)

const runCode = ([name, txt]) =>
  new Task((rej, res) => {
    try {
      eval(txt)
      res(name)
    } catch (error) {
      rej({
        name,
        error,
        message: error.message,
      })
    }
  })

const readFile = name =>
  read({}, name)
  .map(txt => [name, txt])

const capture = rx => str => {
  let m, ms = []
  while (m = rx.exec(str)) ms.push(m.slice(1))
  return ms
}

/// strLit('x') -> '"x"'
/// strLit('"x"') -> '"\\"x\\""'
const strLit = x =>
  `"${x.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

const captureCases = capture(/\/\/\/ +(.+) +-> +(.+)/g)

const asAssert = ([input, output]) =>
  `process.stdout.write(${strLit("  " + input + " -> " + output)}); _premunition_assert.deepStrictEqual(${input}, ${output}); console.log(${strLit(green(" +"))})`

const extractAsserts =
  pipe(
    captureCases,
    map(asAssert),
  )

const appendAsserts = ([name, txt]) =>
  [name, txt + `\nconst _premunition_assert = require('assert'); console.log("\\n", ${strLit(name + ":")});\n` + extractAsserts(txt).join('\n')]

const testFile =
  pipe(
    appendAsserts,
    transformCode,
    runCode,
  )

const $_failure = ({name, error, message}) => {
  console.log(red(' FAIL') + "\n\n" + red("  result:"), error.actual, yellow("\nexpected:"), green(error.expected))
}

const test = _args =>
  exec({}, `ag -lG js "^ *///(.*->)"`)
  .chain(pipe(
    stdout,
    trim,
    split(/\s+/gm),
    sortBy(toString), //-> List Filename
    map(readFile), //-> List (Task File)
    map(chain(testFile)),
    sequence(Task.of), //-> Task (List File)
    map(join(' ')),
  ))
  .fork($_failure, () => {})

module.exports = test
