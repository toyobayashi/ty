const { watch, startDevServer } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')
const fs = require('fs-extra')

function serve (config) {
  const webpackConfig = new WebpackConfig(config)

  if (config.target === 'electron') {
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

      console.log(stats.toString(config.statsOptions) + '\n')
    })

    if (config.entry.preload) {
      watch(webpackConfig.preloadConfig, function watchHandler (err, stats) {
        if (err) {
          console.log(err)
          return
        }

        console.log(stats.toString(config.statsOptions) + '\n')
      })
    }

    startDevServer(webpackConfig.rendererConfig, config.devServerPort, config.devServerHost, function (err) {
      if (err) {
        console.log(err)
        // return
      }
    })
  } else if (config.target === 'node') {
    watch(webpackConfig.nodeConfig, function watchHandler (err, stats) {
      if (err) {
        console.log(err)
        return
      }

      console.log(stats.toString(config.statsOptions) + '\n')
    })
  } else {
    startDevServer(webpackConfig.webConfig, config.devServerPort, config.devServerHost, function (err) {
      if (err) {
        console.log(err)
      }
    })
  }
}

module.exports = serve
