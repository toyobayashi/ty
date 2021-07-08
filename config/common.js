const fs = require('fs-extra')
const wrapPlugin = require('../util/plugin.js')
const { webpack, getPluginImplementation } = require('../util/webpack.js')

const DefinePlugin = wrapPlugin('webpack.DefinePlugin', webpack.DefinePlugin)

function createBaseOptimization () {
  return {
    splitChunks: {
      chunks: 'all',
      name: false,
      cacheGroups: {
        node_modules: {
          name: 'node-modules',
          test: /[\\/]node_modules[\\/]/,
          priority: -9,
          chunks: 'all'
        }
      }
    }
  }
}

function createDefinePlugin (wc, config) {
  return new DefinePlugin({
    ...(wc._useTypeScript
      ? {
          __classPrivateFieldGet: ['tslib', '__classPrivateFieldGet'],
          __classPrivateFieldSet: ['tslib', '__classPrivateFieldSet']
        }
      : {}),
    ...(config.define || {})
  })
}

function createCopyPlugin (wc, config, output) {
  const from = wc.pathUtil.getPath(config.staticDir || 'public')
  const to = wc.pathUtil.getPath(config.output[output])
  const CopyWebpackPlugin = wrapPlugin('CopyWebpackPlugin', getPluginImplementation(config, 'copy-webpack-plugin'))
  return (fs.existsSync(from)
    ? [new CopyWebpackPlugin({
        patterns: [
          {
            from,
            to,
            toType: 'dir',
            globOptions: {
              ignore: [
                '**/.gitkeep',
                '**/.DS_Store',
                ...(() => {
                  return config.indexHtml.filter(t => (typeof t === 'string' || (t.template != null))).map(t => {
                    if (typeof t === 'string') {
                      return wc.pathUtil.getPath(t).replace(/\\/g, '/')
                    }
                    return wc.pathUtil.getPath(t.template).replace(/\\/g, '/')
                  })
                })()
              ]
            },
            noErrorOnMissing: true
          }
        ]
      })]
    : [])
}

function defaultResolveFallback () {
  return {
    dgram: false,
    fs: false,
    net: false,
    tls: false,
    child_process: false
  }
}

function defaultEs5OutputEnvironment () {
  return {
    arrowFunction: false,
    bigIntLiteral: false,
    const: false,
    destructuring: false,
    dynamicImport: false,
    forOf: false,
    module: false
  }
}

function createDevServerConfig (wc, config, before) {
  return {
    stats: config.statsOptions,
    hot: true,
    host: config.devServerHost,
    inline: true,
    ...(wc._webTarget ? { open: config.devServerOpenBrowser } : {}),
    contentBase: [wc.pathUtil.getPath(config.contentBase)],
    publicPath: computePublicPath(wc, config),
    ...(config.proxy ? { proxy: config.proxy } : {}),
    ...(typeof before === 'function' ? { before } : {})
  }
}

function computePublicPath (wc, config) {
  return typeof config.publicPath === 'string' ? config.publicPath : (wc._electronTarget ? '/app/renderer/' : '/')
}

function getCjsLibraryTarget (wc) {
  return (wc._webpack5
    ? {
        library: {
          type: 'commonjs2'
        }
      }
    : {
        libraryTarget: 'commonjs2'
      })
}

exports.createBaseOptimization = createBaseOptimization
exports.createDefinePlugin = createDefinePlugin
exports.createCopyPlugin = createCopyPlugin
exports.defaultResolveFallback = defaultResolveFallback
exports.defaultEs5OutputEnvironment = defaultEs5OutputEnvironment
exports.computePublicPath = computePublicPath
exports.createDevServerConfig = createDevServerConfig
exports.getCjsLibraryTarget = getCjsLibraryTarget
