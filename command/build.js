const { compile, copyExtraResources } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function build (config) {
  const webpackConfig = new WebpackConfig(config)
  if (config.target === 'electron') {
    copyExtraResources(config, webpackConfig, false)
    return Promise.all([
      compile(webpackConfig.mainConfig, config.statsOptions),
      compile(webpackConfig.rendererConfig, config.statsOptions),
      config.entry.preload ? compile(webpackConfig.preloadConfig, config.statsOptions) : Promise.resolve()
    ])
  }

  if (config.target === 'node') {
    return compile(webpackConfig.nodeConfig, config.statsOptions)
  }
  return compile(webpackConfig.webConfig, config.statsOptions)
}

module.exports = build
