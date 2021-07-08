const semver = require('semver')
const wrapPlugin = require('../util/plugin.js')
const { webpack, getLoaderPath } = require('../util/webpack.js')

const ProvidePlugin = wrapPlugin('webpack.ProvidePlugin', webpack.ProvidePlugin)

function createCommonTSLoader (wc, config, tsconfig) {
  return {
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: [
      {
        loader: getLoaderPath(config, 'ts-loader'),
        options: {
          transpileOnly: true,
          configFile: wc.pathUtil.getPath(tsconfig)
        }
      }
    ]
  }
}

function createTypeScriptHelperProvidePlugin (wc) {
  const typescript = (wc.pkg.devDependencies && wc.pkg.devDependencies.typescript) || (wc.pkg.dependencies && wc.pkg.dependencies.typescript)
  if (typeof typescript === 'string' && semver.lt(typescript.replace(/^[~^]/, ''), '4.0.0')) {
    return [
      new ProvidePlugin({
        __classPrivateFieldGet: ['tslib', '__classPrivateFieldGet'],
        __classPrivateFieldSet: ['tslib', '__classPrivateFieldSet']
      })
    ]
  }
  return []
}

function createTSXLoader (wc, config, tsconfig) {
  return [
    {
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [
        {
          loader: getLoaderPath(config, 'ts-loader'),
          options: {
            ...(wc._useVue ? { appendTsSuffixTo: [/\.vue$/] } : {}),
            transpileOnly: true,
            configFile: wc.pathUtil.getPath(config.tsconfig[tsconfig])
          }
        }
      ]
    },
    {
      test: /\.tsx$/,
      exclude: /node_modules/,
      use: [
        ...((wc._useBabel && wc._useVue) ? [{ loader: getLoaderPath(config, 'babel-loader') }] : []),
        {
          loader: getLoaderPath(config, 'ts-loader'),
          options: {
            ...(wc._useVue ? { appendTsSuffixTo: [/\.vue$/] } : {}),
            transpileOnly: true,
            configFile: wc.pathUtil.getPath(config.tsconfig[tsconfig])
          }
        }
      ]
    }
  ]
}

exports.createCommonTSLoader = createCommonTSLoader
exports.createTypeScriptHelperProvidePlugin = createTypeScriptHelperProvidePlugin
exports.createTSXLoader = createTSXLoader
