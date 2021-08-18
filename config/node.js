const { getLoaderPath } = require('../util/webpack.js')
const { createCommonTSLoader } = require('./typescript.js')

function createNodeLoader (config) {
  return {
    test: /\.node$/,
    exclude: /node_modules/,
    use: [
      {
        loader: getLoaderPath(config, 'native-addon-loader'),
        options: {
          name: config.out.node,
          from: '.'
        }
      }
    ]
  }
}

function createNodeBaseRules (wc, tsconfig, config) {
  return [
    ...(wc._useTypeScript ? [createCommonTSLoader(wc, config, tsconfig)] : []),
    createNodeLoader(config)
  ]
}

exports.createNodeLoader = createNodeLoader
exports.createNodeBaseRules = createNodeBaseRules
