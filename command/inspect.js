const WebpackConfig = require('../config/webpack.config.js')
const { stringify } = require('javascript-stringify')
const { highlight } = require('cli-highlight')

module.exports = function (config) {
  console.log(highlight(stringify(new WebpackConfig(config, false), function (value, space, next) {
    if (typeof value === 'function') {
      if (value.toString().length > 100) {
        return '[Function]'
      } else {
        return next(value)
      }
    } else if (value.__ty_webpack_plugin_name__) {
      return `new ${value.__ty_webpack_plugin_name__}(${value.__ty_webpack_plugin_options__ ? stringify(value.__ty_webpack_plugin_options__, null, 2) : ''})`
    }
    return next(value)
  }, 2), { language: 'js' }))
}
