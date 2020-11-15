#!/usr/bin/env node

if (process.argv.length <= 2) {
  printHelp()
}

if (process.argv[2] === '-v' || process.argv[2] === '--version') {
  console.log(require('../package.json').version)
  process.exit(0)
}

if (process.argv[2] === '-h' || process.argv[2] === '--help') {
  printHelp()
}

const args = require('minimist')(process.argv.slice(3))
for (const key in args) {
  switch (args[key]) {
    case 'true':
      args[key] = true
      break
    case 'false':
      args[key] = false
      break
    case 'null':
      args[key] = null
      break
    case 'undefined':
      args[key] = undefined
      break
    default:
      break
  }

  if (typeof args[key] === 'string') {
    if (args[key][0] === '#') {
      args[key] = args[key].substring(1)
    }
  }

  if ((/-[a-z]/).test(key)) {
    args[key.replace(/-([a-z])/g, (_match, p1, _offset, _str) => p1.toUpperCase())] = args[key]
    delete args[key]
  }
}

const register = require('../util/module.js')
register(args.context)
const context = args.context

const childProcess = require('child_process')
const oldFork = childProcess.fork
childProcess.fork = function (modulePath, args, options) {
  return oldFork.call(this, require('path').join(__dirname, 'fork.js'), [context || '', modulePath, ...args], options)
}

require('../util/ts.js')
main(process.argv[2], args)

function main (command, args = { _: [] }, userConfig = {}) {
  const defaultProduction = ['build', 'pack']
  if (args.mode === 'production' || defaultProduction.indexOf(command) !== -1) {
    process.env.NODE_ENV = 'production'
  }

  const readTyConfig = require('../config/config.js')
  const merge = require('deepmerge')
  const PathUtil = require('../util/path.js')
  const pu = new PathUtil(args.context || userConfig.context)
  let config = readTyConfig(args.config, pu.getPath.bind(pu))

  const cliConfig = require('../util/validate.js').cliSupportOption
  cliConfig.forEach((key) => {
    if (key in args) {
      if (Object.prototype.toString.call(args[key]) === '[object Object]') {
        config[key] = {
          ...(config[key] || {}),
          ...args[key]
        }
      } else {
        config[key] = args[key]
      }
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

    const cmdscript = require.resolve('../command/' + c)
    if (!require('fs').existsSync(cmdscript)) {
      throw new Error(`Command "${command}" is not supported.`)
    }

    return require(cmdscript)
  }

  const fn = getCommand(command)

  return fn(config, args, getCommand)
}

function printHelp () {
  console.log('Version: ' + require('../package.json').version)
  console.log('\nUsage: ty <command> [options]')
  console.log('\nCommands:')
  console.log('  build')
  console.log('  serve')
  console.log('  watch')
  console.log('  start')
  console.log('  dev')
  console.log('  pack')
  console.log('  inspect')
  console.log('  vscode')
  console.log('\nOptions:')
  console.log('  --config=[anypath.js|anypath.ts]')
  console.log('  --dev-server-host=localhost')
  console.log('  --dev-server-port=8090')
  console.log('  --mode=[development|production]')
  console.log('  --target=[web|electron]')
  console.log('  --arch=[ia32|x64]')
  console.log('  --webpack=4')
  console.log('  --ts=[0|1]')
  console.log('  --vue=[0|1]')
  console.log('  --eslint=[0|1]')
  console.log('  --sass=[0|1]')
  console.log('  --less=[0|1]')
  console.log('  --stylus=[0|1]')
  console.log('  --generate=[0|1]')
  console.log('  --context=project/root/path')
  console.log('  --production-sourcemap')
  console.log('  --progress')
  console.log('  --define.PRE_DEFINE_VARIABLE=\'value\'')
  console.log('\nRepo: https://github.com/toyobayashi/ty')
  process.exit(0)
}
