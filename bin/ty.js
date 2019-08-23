#!/usr/bin/env node

if (process.argv.length <= 2) {
  console.log('v' + require('../package.json').version)
  console.log('ty dev|serve|start|build|pack [--mode=production]')
  process.exit(0)
}

if (process.argv[2] === '-v' || process.argv[2] === '--version') {
  console.log('v' + require('../package.json').version)
  process.exit(0)
}

const command = process.argv[2]

const args = require('minimist')(process.argv.slice(3))
const config = require('../config/config.js')

const cliConfig = ['mode', 'arch', 'target', 'devServerHost', 'devServerPort']

cliConfig.forEach((key) => {
  if (args[key]) {
    config[key] = args[key]
    if (key === 'mode') {
      process.env.NODE_ENV = args[key]
    }
  }
})

const ty = require('../index.js')
if (ty[command]) {
  ty[command](config)
} else {
  throw new Error(`Command "${command}" is not supported.`)
}
