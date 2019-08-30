const WebpackConfig = require('../config/webpack.config.js')
const { stringify } = require('javascript-stringify')
const { highlight } = require('cli-highlight')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

module.exports = function (config) {
  console.log(highlight(stringify(new WebpackConfig(config), function (value, space, next) {
    if (typeof value === 'function') {
      if (value.toString().length > 100) {
        return '[Function]'
      } else {
        return next(value)
      }
    } else if (value instanceof ForkTsCheckerWebpackPlugin) {
      return '[ForkTsCheckerWebpackPlugin]'
    }
    return next(value)
  }, 2), { language: 'js' }))
}
