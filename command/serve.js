const { watch, startDevServer, copyExtraResources } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function serve (config) {
  const webpackConfig = new WebpackConfig(config)

  if (config.target === 'electron') {
    copyExtraResources(config, webpackConfig, true)

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

    startDevServer(webpackConfig.rendererConfig, function (err) {
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
