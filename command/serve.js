const config = require('../config/config.js')
const startDevServer = require('../util/server.js')
const { watch } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function serve (args) {
  if (args.mode) {
    process.env.NODE_ENV = config.mode = args.mode
  }
  const webpackConfig = new WebpackConfig(config)
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
}

module.exports = serve
