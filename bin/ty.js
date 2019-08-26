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

const args = require('minimist')(process.argv.slice(3))
for (const key in args) {
  if ((/-[a-z]/).test(key)) {
    args[key.replace(/-([a-z])/g, (_match, p1, _offset, _str) => p1.toUpperCase())] = args[key]
    delete args[key]
  }
}

const config = require('../config/config.js')
const command = process.argv[2]
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

require('../index.js')(command, config)
