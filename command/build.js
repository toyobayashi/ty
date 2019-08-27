const { compile } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function build (config) {
  const webpackConfig = new WebpackConfig(config)
  if (webpackConfig._electronTarget) {
    return Promise.all([
      compile(webpackConfig.mainConfig, config.statsOptions),
      compile(webpackConfig.rendererConfig, config.statsOptions)
    ])
  }
  return compile(webpackConfig.webConfig, config.statsOptions)
}

module.exports = build
