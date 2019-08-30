const { watch, startDevServer } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function serve (config) {
  const webpackConfig = new WebpackConfig(config)

  if (webpackConfig._electronTarget) {
    watch(webpackConfig.mainConfig, function watchHandler (err, stats) {
      if (err) {
        console.log(err)
        return
      }

      console.log(stats.toString(config.statsOptions) + '\n')
    })

    startDevServer(webpackConfig.rendererConfig, config.devServerPort, config.devServerHost, function (err) {
      if (err) {
        console.log(err)
        // return
      }
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
