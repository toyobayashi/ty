const { execSync } = require('child_process')
const { existsSync } = require('fs-extra')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserWebpackPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpackNodeExternals = require('webpack-node-externals')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const getPath = require('../util/path.js')

class WebpackConfig {
  _createCssLoader (config) {
    return [
      config.mode === 'production' ? MiniCssExtractPlugin.loader : (this._useVue ? require.resolve('vue-style-loader') : require.resolve('style-loader')),
      require.resolve('css-loader')
    ]
  }

  _createEslintLoader () {
    return {
      loader: require.resolve('eslint-loader'),
      options: {
        emitWarning: true,
        emitError: false
      }
    }
  }

  constructor (config) {
    this._pkg = require(getPath('package.json'))
    this._useVue = (this._pkg.devDependencies && this._pkg.devDependencies.vue) || (this._pkg.dependencies && this._pkg.dependencies.vue)
    this._useTypeScript = (this._pkg.devDependencies && this._pkg.devDependencies.typescript) || existsSync(getPath('tsconfig.json'))
    this._useESLint = (this._pkg.devDependencies && this._pkg.devDependencies.eslint) || (
      existsSync(getPath('.eslintrc.js')) ||
      existsSync(getPath('.eslintrc.yml')) ||
      existsSync(getPath('.eslintrc.yaml')) ||
      existsSync(getPath('.eslintrc.json')) ||
      existsSync(getPath('.eslintrc')) ||
      (this._pkg.eslintConfig !== undefined)
    )

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
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('ts-loader'),
                options: {
                  transpileOnly: true,
                  configFile: getPath('./src/main/tsconfig.json')
                }
              }
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

    if (this._useESLint) {
      this.mainConfig.module.rules.unshift({
        test: /\.jsx?$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [this._createEslintLoader()]
      })
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
            test: /\.jsx$/,
            exclude: /node_modules/,
            use: [
              require.resolve('babel-loader')
            ]
          },
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('ts-loader'),
                options: {
                  appendTsSuffixTo: [/\.vue$/],
                  transpileOnly: true,
                  configFile: getPath('./src/renderer/tsconfig.json')
                }
              }
            ]
          },
          {
            test: /\.vue$/,
            use: [
              require.resolve('vue-loader')
            ]
          },
          {
            test: /\.css$/,
            use: [
              ...(this._createCssLoader(config))
            ]
          },
          {
            test: /\.styl(us)?$/,
            use: [
              ...(this._createCssLoader(config)),
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
          title: this._pkg.name,
          template: getPath(config.indexHtml),
          minify: config.mode === 'production' ? config.htmlMinify : false
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

    if (this._useVue) {
      const { VueLoaderPlugin } = require('vue-loader')
      this.rendererConfig.plugins = [
        ...(this.rendererConfig.plugins || []),
        new VueLoaderPlugin()
      ]
    }

    if (this._useESLint) {
      for (let i = 0; i < this.rendererConfig.module.rules.length; i++) {
        if (this.rendererConfig.module.rules[i].test.toString().indexOf('vue') !== -1) {
          this.rendererConfig.module.rules[i].use.push(this._createEslintLoader())
          break
        }
      }
      this.rendererConfig.module.rules.unshift({
        test: /\.jsx?$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [this._createEslintLoader()]
      })
    }
  }

  _initProductionPackage (config) {
    const author = typeof this._pkg.author === 'object' ? this._pkg.author.name : this._pkg.author

    const productionPackage = {
      name: this._pkg.name,
      version: this._pkg.version,
      main: this._pkg.main,
      author,
      license: this._pkg.license
    }

    if (this._pkg.dependencies) {
      productionPackage.dependencies = this._pkg.dependencies
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
          customDir: this._pkg.devDependencies.electron
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
      contentBase: [getPath(config.contentBase)],
      publicPath: config.publicPath,
      before (app, server) {
        app.use(require('express-serve-asar')(getPath(config.contentBase)))
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

    if (this._useTypeScript) {
      this.rendererConfig.plugins = [
        ...(this.rendererConfig.plugins || []),
        new ForkTsCheckerWebpackPlugin({
          eslint: this._useESLint,
          tsconfig: getPath('src/renderer/tsconfig.json'),
          vue: this._useVue
        })
      ]

      this.mainConfig.plugins = [
        ...(this.mainConfig.plugins || []),
        new ForkTsCheckerWebpackPlugin({
          eslint: this._useESLint,
          tsconfig: getPath('src/main/tsconfig.json')
        })
      ]
    }
  }

  _mergeProduction (config) {
    const terser = () => new TerserWebpackPlugin(config.terserPlugin)
    this.rendererConfig.plugins = [
      ...(this.rendererConfig.plugins || []),
      new MiniCssExtractPlugin({
        filename: '[name].css'
      })
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

    if (this._useTypeScript) {
      this.rendererConfig.plugins = [
        ...(this.rendererConfig.plugins || []),
        new ForkTsCheckerWebpackPlugin({
          eslint: this._useESLint,
          tsconfig: getPath('src/renderer/tsconfig.json'),
          vue: this._useVue,
          async: false,
          useTypescriptIncrementalApi: true,
          memoryLimit: 4096
        })
      ]

      this.mainConfig.plugins = [
        ...(this.mainConfig.plugins || []),
        new ForkTsCheckerWebpackPlugin({
          eslint: this._useESLint,
          tsconfig: getPath('src/main/tsconfig.json'),
          async: false,
          useTypescriptIncrementalApi: true,
          memoryLimit: 4096
        })
      ]
    }
  }
}

module.exports = WebpackConfig
