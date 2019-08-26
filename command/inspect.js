const WebpackConfig = require('../config/webpack.config.js')
const { stringify } = require('javascript-stringify')
const { highlight } = require('cli-highlight')

module.exports = function (config) {
  console.log(highlight(stringify(new WebpackConfig(config), null, 2), { language: 'js' }))
}
