const { watch } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')
const { HotModuleReplacementPlugin } = require('webpack')

function _watch (config) {
  if (config.extractcss === undefined) config.extractcss = 1
  const webpackConfig = new WebpackConfig(config)

  const watchConfig = (webpackConf) => watch(webpackConf, function watchHandler (err, stats) {
    if (err) {
      console.log(err)
      return
    }

    console.log(stats.toString(config.statsOptions) + '\n')
  })

  if (config.target === 'electron') {
    removeServerConfig(webpackConfig.rendererConfig)
    watchConfig(webpackConfig.mainConfig)
    watchConfig(webpackConfig.rendererConfig)
    if (config.entry.preload) {
      watchConfig(webpackConfig.preloadConfig)
    }
  } else if (config.target === 'node') {
    watchConfig(webpackConfig.nodeConfig)
  } else {
    removeServerConfig(webpackConfig.webConfig)
    watchConfig(webpackConfig.webConfig)
  }
}

function removeServerConfig (webpackConf) {
  delete webpackConf.devServer
  delete webpackConf.output.publicPath
  if (webpackConf.plugins) {
    for (let i = 0; i < webpackConf.plugins.length; i++) {
      if (webpackConf.plugins[i] instanceof HotModuleReplacementPlugin) {
        webpackConf.plugins.splice(i, 1)
        break
      }
    }
  }
}

module.exports = _watch
