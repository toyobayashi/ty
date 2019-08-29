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

require('../util/module.js')

const args = require('minimist')(process.argv.slice(3))
for (const key in args) {
  if ((/-[a-z]/).test(key)) {
    args[key.replace(/-([a-z])/g, (_match, p1, _offset, _str) => p1.toUpperCase())] = args[key]
    delete args[key]
  }
}

require('../index.js')(process.argv[2], args)
