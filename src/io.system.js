const {curry} = require('ramda')
const Task = require('data.task')
const cp = require('child_process')

exports.exec = curry((options, command) =>
  new Task((rej, res) => {
    cp.exec(command, options, (err, stdout, stderr) => {
      if (err) rej(err)
      else res([stdout, stderr])
    })
  }))

exports.stdout = ([out, _]) => out
exports.stderr = ([_, err]) => err
