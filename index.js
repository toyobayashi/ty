module.exports = function (command, args = { _: [] }, userConfig = {}) {
  const readTyConfig = require('./config/config.js')
  const merge = require('deepmerge')
  const PathUtil = require('./util/path.js')
  const pu = new PathUtil(args.context || userConfig.context)
  let config = readTyConfig(args.config, pu.getPath.bind(pu))

  const defaultProduction = ['build', 'pack']
  if (defaultProduction.indexOf(command) !== -1) {
    process.env.NODE_ENV = config.mode = 'production'
  }

  const cliConfig = require('./util/validate.js').cliSupportOption
  cliConfig.forEach((key) => {
    if (key in args) {
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
    } catch (err) {
      console.error(err)
    }
    return fn
  }

  const fn = getCommand(command)
  if (!fn) {
    throw new Error(`Command "${command}" is not supported.`)
  }

  return fn(config, args, getCommand)
}
