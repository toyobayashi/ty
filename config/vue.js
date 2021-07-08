const wrapPlugin = require('../util/plugin.js')
const { getLoaderPath } = require('../util/webpack.js')

function createVueLoader (config) {
  return {
    test: /\.vue$/,
    use: [
      {
        loader: getLoaderPath(config, 'vue-loader')
      }
    ]
  }
}

function insertVueLoaderPlugin (config, webpackConfig) {
  const VueLoaderPlugin = wrapPlugin('VueLoaderPlugin', require(getLoaderPath(config, 'vue-loader')).VueLoaderPlugin)
  if (Array.isArray(webpackConfig.plugins)) {
    webpackConfig.plugins.push(new VueLoaderPlugin())
  } else {
    webpackConfig.plugins = [new VueLoaderPlugin()]
  }
}

exports.createVueLoader = createVueLoader
exports.insertVueLoaderPlugin = insertVueLoaderPlugin
