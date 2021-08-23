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

function createJavaScriptLoader (wc, config, typescriptAllowJS, tsconfigType, vue) {
  return (wc._useBabel || typescriptAllowJS) ? [
    {
      test: /\.(m|c)?jsx?$/,
      exclude: /node_modules/,
      use: [
        ...(wc._useBabel ? [{
          loader: getLoaderPath(config, 'babel-loader')
        }] : []),
        ...(typescriptAllowJS ? [{
          loader: getLoaderPath(config, 'ts-loader'),
          options: {
            ...(vue && wc._useVue ? { appendTsSuffixTo: [/\.vue$/] } : {}),
            transpileOnly: true,
            configFile: wc.pathUtil.getPath(config.tsconfig[tsconfigType])
          }
        }] : [])
      ]
    }
  ] : []
}

exports.createEslintPlugin = createEslintPlugin
exports.createJavaScriptLoader = createJavaScriptLoader
