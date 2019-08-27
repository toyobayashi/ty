const { spawn } = require('child_process')
const getPath = require('../util/path.js')

function start (config) {
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright('This command does not support web target'))
    process.exit(1)
  }

  if (config.mode === 'production') {
    const cp = spawn(require('electron'), [
      getPath(config.resourcesPath, 'app')
    ], {
      cwd: getPath(),
      stdio: 'inherit'
    })
    return cp
  } else {
    const cp = spawn(require('electron'), [
      '--remote-debugging-port=9222',
      '--inspect=' + Date.now() % 65536,
      getPath(config.resourcesPath, 'app')
    ], {
      cwd: getPath(),
      stdio: 'inherit'
    })
    return cp
  }
}

module.exports = start
