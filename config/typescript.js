const semver = require('semver')
const { existsSync, readJSONSync } = require('fs-extra')
const wrapPlugin = require('../util/plugin.js')
const { webpack, getLoaderPath } = require('../util/webpack.js')

const ProvidePlugin = wrapPlugin('webpack.ProvidePlugin', webpack.ProvidePlugin)

function createCommonTSLoader (wc, config, tsconfig) {
  return {
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: wc._useBabelToTransformTypescript ? [{
      loader: getLoaderPath(config, 'babel-loader')
    }] : [
      ...((wc._useBabel) ? [{ loader: getLoaderPath(config, 'babel-loader') }] : []),
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
  if (!wc._useBabelToTransformTypescript && typeof typescript === 'string' && semver.lt(typescript.replace(/^[~^]/, ''), '4.0.0')) {
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
        wc._useBabelToTransformTypescript ? {
          loader: getLoaderPath(config, 'babel-loader')
        } : {
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
      use: wc._useBabelToTransformTypescript ? [{
        loader: getLoaderPath(config, 'babel-loader')
      }] : [
        ...((wc._useVueJsx) ? [{ loader: getLoaderPath(config, 'babel-loader') }] : []),
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

function tryReadTSConfig (absPath) {
  const ex = existsSync(absPath)
  let tsconfig
  if (ex) {
    try {
      tsconfig = readJSONSync(absPath)
    } catch (_) {
      return ex
    }
    return tsconfig
  } else {
    return ex
  }
}

function isAllowJs (wc, tsconfig) {
  return !!(wc._useTypeScript && tsconfig && tsconfig.compilerOptions && tsconfig.compilerOptions.allowJs)
}

exports.createCommonTSLoader = createCommonTSLoader
exports.createTypeScriptHelperProvidePlugin = createTypeScriptHelperProvidePlugin
exports.createTSXLoader = createTSXLoader
exports.tryReadTSConfig = tryReadTSConfig
exports.isAllowJs = isAllowJs
