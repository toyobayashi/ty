const { getLoaderPath } = require('../util/webpack.js')

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

exports.createJavaScriptLoader = createJavaScriptLoader
