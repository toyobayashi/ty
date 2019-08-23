const { compile } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function build (config) {
  const webpackConfig = new WebpackConfig(config)
  return Promise.all([
    compile(webpackConfig.mainConfig, config.statsOptions),
    compile(webpackConfig.rendererConfig, config.statsOptions)
  ])
}

module.exports = build
