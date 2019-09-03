const { watch } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function _watch (config) {
  const webpackConfig = new WebpackConfig(config)

  const watchConfig = (webpackConf) => watch(webpackConf, function watchHandler (err, stats) {
    if (err) {
      console.log(err)
      return
    }

    console.log(stats.toString(config.statsOptions) + '\n')
  })

  if (config.target === 'electron') {
    watchConfig(webpackConfig.mainConfig)
    watchConfig(webpackConfig.rendererConfig)
  } else if (config.target === 'node') {
    watchConfig(webpackConfig.nodeConfig)
  } else {
    watchConfig(webpackConfig.webConfig)
  }
}

module.exports = _watch
