module.exports = function (command, args = { _: [] }, userConfig = {}) {
  const readTyConfig = require('./config/config.js')
  const merge = require('deepmerge')
  let config = readTyConfig()

  const defaultProduction = ['build', 'pack']
  if (defaultProduction.indexOf(command) !== -1) {
    process.env.NODE_ENV = config.mode = 'production'
  }

  const cliConfig = ['mode', 'arch', 'target', 'devServerHost', 'devServerPort']
  cliConfig.forEach((key) => {
    if (args[key]) {
      config[key] = args[key]
      if (key === 'mode') {
        process.env.NODE_ENV = args[key]
      }
    }
  })

  if (Object.prototype.toString.call(userConfig) === '[object Object]') {
    config = merge(config, userConfig)
  }

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
