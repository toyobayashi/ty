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
  if ((/-[a-z]/).test(key)) {
    args[key.replace(/-([a-z])/g, (_match, p1, _offset, _str) => p1.toUpperCase())] = args[key]
    delete args[key]
  }
}

require('../util/module.js')(args.context)
require('../index.js')(process.argv[2], args)

function printHelp () {
  console.log('ty v' + require('../package.json').version)
  console.log('ty <command> [option]')
  console.log('')
  console.log('Command:')
  console.log('  build')
  console.log('  serve')
  console.log('  start')
  console.log('  dev')
  console.log('  pack')
  console.log('  inspect')
  console.log('  vscode')
  console.log()
  console.log('Options')
  console.log('  --config=[anypath.js|anypath.ts]')
  console.log('  --dev-server-host=localhost')
  console.log('  --dev-server-port=8090')
  console.log('  --mode=[development|production]')
  console.log('  --target=[web|electron]')
  console.log('  --arch=[ia32|x64]')
  console.log('  --ts=[0|1]')
  console.log('  --context=project/root/path')
  console.log('  --production-sourcemap')
  process.exit(0)
}
