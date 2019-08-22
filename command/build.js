const config = require('../config/config.js')
const { compile } = require('../util/webpack.js')
const WebpackConfig = require('../config/webpack.config.js')

function build (args) {
  if (args.mode) {
    process.env.NODE_ENV = config.mode = args.mode
  }
  const webpackConfig = new WebpackConfig(config)
  return Promise.all([
    compile(webpackConfig.mainConfig, config.statsOptions),
    compile(webpackConfig.rendererConfig, config.statsOptions)
  ])
}

module.exports = build
