module.exports = function (command, config) {
  let fn
  try {
    fn = require('./command/' + command)
  } catch (_) {
    throw new Error(`Command "${command}" is not supported.`)
  }

  return fn(config)
}
