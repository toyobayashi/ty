const wrapPlugin = require('../util/plugin.js')
const { getLoaderPath, getPluginImplementation } = require('../util/webpack.js')

function createEslintPlugin (config, extensions) {
  const EslintWebpackPlugin = wrapPlugin('EslintWebpackPlugin', getPluginImplementation(config, 'eslint-webpack-plugin'))
  return new EslintWebpackPlugin({
    extensions,
    emitWarning: true,
    emitError: false,
    ...(typeof config.eslintPluginOptions === 'object' && config.eslintPluginOptions !== null ? config.eslintPluginOptions : {})
  })
}

function createBabelLoader (config, test) {
  return {
    test,
    exclude: /node_modules/,
    use: [
      { loader: getLoaderPath(config, 'babel-loader') }
    ]
  }
}

exports.createEslintPlugin = createEslintPlugin
exports.createBabelLoader = createBabelLoader
