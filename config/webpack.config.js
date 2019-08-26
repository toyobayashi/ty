const { execSync } = require('child_process')
const { existsSync } = require('fs-extra')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserWebpackPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpackNodeExternals = require('webpack-node-externals')
const getPath = require('../util/path.js')

const pkg = require(getPath('package.json'))
const useVue = (pkg.devDependencies && pkg.devDependencies.vue) || (pkg.dependencies && pkg.dependencies.vue)

function createCssLoader (config) {
  return [
    config.mode === 'production' ? MiniCssExtractPlugin.loader : (useVue ? require.resolve('vue-style-loader') : require.resolve('style-loader')),
    require.resolve('css-loader')
  ]
}

function createEslintLoader () {
  return {
    loader: require.resolve('eslint-loader'),
    options: {
      emitWarning: true,
      emitError: false
    }
  }
}

class WebpackConfig {
  constructor (config) {
    this._initMain(config)
    this._initRenderer(config)
    this._initProductionPackage(config)
    this._initPackagerConfig(config)
    if (config.mode === 'production') {
      this._mergeProduction(config)
    } else {
      this._mergeDevelopment(config)
    }
  }

  _initMain (config) {
    this.mainConfig = {
      mode: config.mode,
      context: getPath(),
      target: 'electron-main',
      entry: config.entry.main ? config.entry.main : {
        main: [getPath('./src/main/main')]
      },
      output: {
        filename: '[name].js',
        path: getPath(config.output.main)
      },
      node: false,
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            enforce: 'pre',
            use: [
              createEslintLoader()
            ]
          }
        ]
      },
      externals: [webpackNodeExternals()],
      resolve: {
        alias: {
          '@': getPath('src')
        },
        extensions: ['.js', '.ts', '.json']
      },
      plugins: [
        new CopyWebpackPlugin([
          { from: getPath('package.json'), to: getPath(config.resourcesPath, 'app/package.json') }
        ])
      ]
    }

    if (process.platform === 'linux') {
      this.mainConfig.plugins = [
        ...(this.mainConfig.plugins || []),
        new CopyWebpackPlugin([
          { from: getPath(config.iconSrcDir, '1024x1024.png'), to: getPath(config.resourcesPath, 'icon/app.png') }
        ])
      ]
    }
  }

  _initRenderer (config) {
    this.rendererConfig = {
      mode: config.mode,
      context: getPath(),
      target: 'electron-renderer',
      entry: config.entry.renderer ? config.entry.renderer : {
        renderer: [getPath('./src/renderer/renderer')]
      },
      output: {
        filename: '[name].js',
        path: getPath(config.output.renderer)
      },
      node: false,
      module: {
        rules: [
          {
            test: /\.js$/,
            enforce: 'pre',
            exclude: /node_modules/,
            use: [
              createEslintLoader()
            ]
          },
          {
            test: /\.vue$/,
            use: [
              require.resolve('vue-loader'),
              createEslintLoader()
            ]
          },
          {
            test: /\.css$/,
            use: [
              ...createCssLoader(config)
            ]
          },
          {
            test: /\.styl(us)?$/,
            use: [
              ...createCssLoader(config),
              require.resolve('stylus-loader')
            ]
          }
        ]
      },
      resolve: {
        alias: {
          '@': getPath('src')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.css', '.styl', '.json']
      },
      plugins: [
        new HtmlWebpackPlugin({
          title: pkg.name,
          template: getPath(config.indexHtml),
          minify: config.mode === 'production' ? config.htmlMinify : false
        })
      ],
      optimization: {
        splitChunks: {
          chunks: 'all',
          name: false,
          cacheGroups: {
            'node-modules': {
              name: 'node-modules',
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              chunks: 'all'
            }
          }
        }
      }
    }

    if (useVue) {
      const { VueLoaderPlugin } = require('vue-loader')
      this.rendererConfig.plugins = [
        ...(this.rendererConfig.plugins || []),
        new VueLoaderPlugin()
      ]
    }
  }

  _initProductionPackage (config) {
    const author = typeof pkg.author === 'object' ? pkg.author.name : pkg.author

    const productionPackage = {
      name: pkg.name,
      version: pkg.version,
      main: pkg.main,
      author,
      license: pkg.license
    }

    if (pkg.dependencies) {
      productionPackage.dependencies = pkg.dependencies
    }

    try {
      productionPackage._commit = execSync('git rev-parse HEAD', { cwd: getPath() }).toString().replace(/[\r\n]/g, '')
      productionPackage._commitDate = new Date((execSync('git log -1', { cwd: getPath() }).toString().match(/Date:\s*(.*?)\n/))[1]).toISOString()
    } catch (_) {}

    this.productionPackage = productionPackage
  }

  _initPackagerConfig (config) {
    const packagerOptions = {
      dir: getPath(),
      out: getPath(config.distPath),
      arch: config.arch || process.arch,
      prebuiltAsar: getPath(config.distPath, 'resources/app.asar'),
      appCopyright: `Copyright (C) ${new Date().getFullYear()} ${this.productionPackage.author}`,
      overwrite: true
    }

    if (process.env.npm_config_electron_mirror && process.env.npm_config_electron_mirror.indexOf('taobao') !== -1) {
      packagerOptions.download = {
        unsafelyDisableChecksums: true,
        mirrorOptions: {
          mirror: process.env.npm_config_electron_mirror.endsWith('/') ? process.env.npm_config_electron_mirror : (process.env.npm_config_electron_mirror + '/'),
          customDir: pkg.devDependencies.electron
        }
      }
    }

    if (process.platform === 'win32') {
      const iconPath = getPath(config.iconSrcDir, 'app.ico')
      if (existsSync(iconPath)) {
        packagerOptions.icon = iconPath
      }
    } else if (process.platform === 'darwin') {
      const iconPath = getPath(config.iconSrcDir, 'app.icns')
      if (existsSync(iconPath)) {
        packagerOptions.icon = iconPath
      }
    }

    this.packagerConfig = packagerOptions
  }

  _mergeDevelopment (config) {
    this.rendererConfig.devServer = {
      stats: config.statsOptions,
      hot: true,
      host: config.devServerHost,
      inline: true,
      contentBase: [getPath(config.contentBase), getPath('public')],
      publicPath: config.publicPath,
      before (app, server) {
        if (config.serveAsar) {
          app.use(require('express-serve-asar')(getPath('public')))
        }
        server._watch(config.indexHtml)
      }
    }
    this.rendererConfig.devtool = this.mainConfig.devtool = 'eval-source-map'
    this.rendererConfig.plugins = [
      ...(this.rendererConfig.plugins || []),
      new HotModuleReplacementPlugin()
    ]

    if (config.publicPath) {
      this.rendererConfig.output && (this.rendererConfig.output.publicPath = config.publicPath)
    }
  }

  _mergeProduction (config) {
    const terser = () => new TerserWebpackPlugin(config.terserPlugin)
    this.rendererConfig.plugins = [
      ...(this.rendererConfig.plugins || []),
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),
      new CopyWebpackPlugin([
        {
          from: getPath('public'),
          to: getPath(config.output.renderer),
          toType: 'dir',
          ignore: [
            '.DS_Store'
          ]
        }
      ])
    ]
    this.rendererConfig.optimization = {
      ...(this.rendererConfig.optimization || {}),
      minimizer: [
        terser(),
        new OptimizeCSSAssetsPlugin({})
      ]
    }
    this.mainConfig.optimization = {
      ...(this.mainConfig.optimization || {}),
      minimizer: [terser()]
    }
  }
}

module.exports = WebpackConfig
