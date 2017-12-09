const {construct, concat} = require('ramda')

/// File("x", "y").name -> "x"
/// File("x", "y").body -> "y"
module.exports = construct(class File {
  constructor(name, body) {
    this.name = name
    this.body = String(body)
  }

  /// File("x", " y ").map(trim) -> File("x", "y")
  map(f) {
    return new File(this.name, f(this.body))
  }

  /// File("x", "y").append("z") -> File("x", "yz")
  append(x) {
    return this.map(y => concat(y, x))
  }
})
