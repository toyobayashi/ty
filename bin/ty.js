#!/usr/bin/env node

const ty = require('../index.js')

if (process.argv.length <= 2) {
  console.log('v' + require('../package.json').version)
  console.log('ty dev|serve|start|build [--mode=production]')
  process.exit(0)
}

if (process.argv[2] === '-v' || process.argv[2] === '--version') {
  console.log('v' + require('../package.json').version)
  process.exit(0)
}

const args = require('minimist')(process.argv.slice(3))

if (args.v || args.version) {
  console.log('v' + require('../package.json').version)
}

const command = process.argv[2]

if (ty[command]) {
  ty[command].run(args)
} else {
  throw new Error(`Command "${command}" is not supported.`)
}
