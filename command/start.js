const { spawn } = require('child_process')
const PathUtil = require('../util/path.js')

function start (config) {
  const pathUtil = new PathUtil(config.context)
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright(`This command does not support ${config.target} target`))
    process.exit(1)
  }

  if (config.mode === 'production') {
    const cp = spawn(require('electron'), [
      pathUtil.getPath(config.localResourcesPath, 'app')
    ], {
      cwd: pathUtil.getPath(),
      stdio: 'inherit'
    })
    return cp
  } else {
    const cp = spawn(require('electron'), [
      '--remote-debugging-port=9222',
      '--inspect=' + Date.now() % 65536,
      pathUtil.getPath(config.localResourcesPath, 'app')
    ], {
      cwd: pathUtil.getPath(),
      stdio: 'inherit'
    })
    return cp
  }
}

module.exports = start
