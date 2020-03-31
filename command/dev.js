const WebpackConfig = require('../config/webpack.config.js')
const { watch, startDevServer } = require('../util/webpack.js')
const start = require('./start.js')
const fs = require('fs-extra')

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
  const extraResourcesPath = webpackConfig.pathUtil.getPath(config.extraResourcesPath)
  if (fs.existsSync(extraResourcesPath)) {
    const ls = fs.readdirSync(extraResourcesPath).filter(item => (item !== '.gitkeep'))
    for (const item of ls) {
      fs.copySync(webpackConfig.pathUtil.getPath(config.extraResourcesPath, item), webpackConfig.pathUtil.getPath(config.localResourcesPath, item))
    }
  }
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
