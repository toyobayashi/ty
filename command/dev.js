const WebpackConfig = require('../config/webpack.config.js')
const { watch, startDevServer, copyExtraResources } = require('../util/webpack.js')
const start = require('./start.js')

function dev (config) {
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright(`This command does not support ${config.target} target`))
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
    renderer: false,
    ...(config.entry.preload ? { preload: false } : {})
  }

  const isReady = () => Object.keys(firstLaunch).map(key => firstLaunch[key]).indexOf(false) === -1

  const webpackConfig = new WebpackConfig(config)

  let timer = 0
  copyExtraResources(config, webpackConfig, true, function () {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (isReady()) {
        relaunch()
      }
    }, 300)
  })

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

  if (config.entry.preload) {
    watch(webpackConfig.preloadConfig, function watchHandler (err, stats) {
      if (err) {
        console.log(err)
        return
      }

      if (!firstLaunch.preload) firstLaunch.preload = true

      if (isReady()) {
        relaunch()
      }

      console.log(stats.toString(config.statsOptions) + '\n')
    })
  }

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
