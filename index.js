module.exports = function (command, config, args) {
  const getCommand = (c) => {
    if (config.command && typeof config.command[c] === 'function') {
      return config.command[c]
    }

    let fn
    try {
      fn = require('./command/' + c)
    } catch (_) {}
    return fn
  }

  const fn = getCommand(command)
  if (!fn) {
    throw new Error(`Command "${command}" is not supported.`)
  }

  return fn(config, args, getCommand)
}
