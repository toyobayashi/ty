const WebpackConfig = require('../config/webpack.config.js')
const startDevServer = require('../util/server.js')
const { watch } = require('../util/webpack.js')
const start = require('./start.js')

function dev (config) {
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright('Run "ty serve" instead if your building target is web'))
    process.exit(1)
  }

  let appProcess = null

  function onExit (_code, signal) {
    appProcess = null
    if (signal === 'SIGKILL') {
      appProcess = start(config)
      appProcess.once('exit', onExit)
    }
  }

  function relaunch () {
    if (appProcess) {
      appProcess.kill('SIGKILL')
    } else {
      appProcess = start(config)
      appProcess.once('exit', onExit)
    }
  }

  const firstLaunch = {
    main: false,
    renderer: false
  }

  const isReady = () => firstLaunch.main && firstLaunch.renderer

  const webpackConfig = new WebpackConfig(config)

  watch(webpackConfig.mainConfig, function watchHandler (err, stats) {
    if (err) {
      console.log(err)
      return
    }

    if (!firstLaunch.main) firstLaunch.main = true

    if (isReady()) {
      relaunch()
    }

    console.log(stats.toString(config.statsOptions) + '\n')
  })

  startDevServer(webpackConfig.rendererConfig, config.devServerPort, config.devServerHost, function (err) {
    if (err) {
      console.log(err)
      return
    }
    if (!firstLaunch.renderer) firstLaunch.renderer = true

    if (!appProcess && isReady()) {
      relaunch()
    }
  })
}

module.exports = dev
