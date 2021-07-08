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

function defaultNodeLib () {
  return {
    global: false,
    __dirname: false,
    __filename: false,
    Buffer: false,
    process: false,
    console: false,
    setImmediate: false,

    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
}

exports.createNodeLoader = createNodeLoader
exports.createNodeBaseRules = createNodeBaseRules
exports.defaultNodeLib = defaultNodeLib
