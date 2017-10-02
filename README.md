# premunition

A simple way to write tests.

### Installation

    brew install ag
    npm install -g premunition

### Usage

    cd dope_project
    prem

## Examples

Add comments (with an extra `/`) anywhere in your code with the form:

`code -> expected`

```js

/// 1 + 1 -> 2

/// add(1, 2) -> 3
const add = (x, y) =>
  x + y
```
