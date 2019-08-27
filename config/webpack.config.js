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
const path = require('path')

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

  _createAssetsLoader (config) {
    return [
      {
        test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
        use: [
          this._createUrlLoader('img', config)
        ]
      },
      {
        test: /\.(svg)(\?.*)?$/,
        use: [
          this._createFileLoader('img', config)
        ]
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        use: [
          this._createUrlLoader('media', config)
        ]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
        use: [
          this._createUrlLoader('fonts', config)
        ]
      }
    ]
  }

  _createUrlLoader (dir, config) {
    return {
      loader: require.resolve('url-loader'),
      options: {
        limit: 4096,
        fallback: this._createFileLoader(dir, config)
      }
    }
  }

  _createFileLoader (dir, config) {
    return {
      loader: require.resolve('file-loader'),
      options: {
        name: path.posix.join(config.assetsPath || '', dir, '[name].[ext]')
      }
    }
  }

  constructor (config) {
    this._pkg = require(getPath('package.json'))
    this._useVue = !!((this._pkg.devDependencies && this._pkg.devDependencies.vue) || (this._pkg.dependencies && this._pkg.dependencies.vue))
    this._electronTarget = (config.target === 'electron')
    this._useTypeScript = !!((this._pkg.devDependencies && this._pkg.devDependencies.typescript) || existsSync(getPath('tsconfig.json')))
    this._useESLint = !!((this._pkg.devDependencies && this._pkg.devDependencies.eslint) || (
      existsSync(getPath('.eslintrc.js')) ||
      existsSync(getPath('.eslintrc.yml')) ||
      existsSync(getPath('.eslintrc.yaml')) ||
      existsSync(getPath('.eslintrc.json')) ||
      existsSync(getPath('.eslintrc')) ||
      (this._pkg.eslintConfig !== undefined)
    ))
    this._useBabel = !!((this._pkg.devDependencies && this._pkg.devDependencies['@babel/core']) || (
      existsSync(getPath('babel.config.js')) ||
      existsSync(getPath('.babelrc'))
    ))

    if (this._electronTarget) {
      this._initMain(config)
      this._initRenderer(config)
      this._initProductionPackage(config)
      this._initPackagerConfig(config)
    } else {
      this._initWeb(config)
    }

    if (config.mode === 'production') {
      this._mergeProduction(config)
    } else {
      this._mergeDevelopment(config)
    }

    if (config.configureWebpack) {
      if (this._electronTarget) {
        if (typeof config.configureWebpack.renderer === 'function') config.configureWebpack.renderer(this.rendererConfig)
        if (typeof config.configureWebpack.main === 'function') config.configureWebpack.main(this.mainConfig)
      } else {
        if (typeof config.configureWebpack.web === 'function') config.configureWebpack.web(this.webConfig)
      }
    }
  }

  _initWeb (config) {
    this.webConfig = {
      mode: config.mode,
      context: getPath(),
      target: 'web',
      entry: config.entry.web ? config.entry.web : {
        app: [getPath('./src/index')]
      },
      output: {
        filename: '[name].js',
        path: getPath(config.output.web)
      },
      node: {
        setImmediate: false,
        dgram: 'empty',
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty'
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('ts-loader'),
                options: {
                  appendTsSuffixTo: [/\.vue$/],
                  transpileOnly: true,
                  configFile: getPath('tsconfig.json')
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
          },
          ...(this._createAssetsLoader(config))
        ]
      },
      resolve: {
        alias: {
          '@': getPath('src')
        },
        extensions: ['.ts', '.tsx', '.js', '.vue', '.css', '.styl', '.stylus', '.json']
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
            to: getPath(config.output.web),
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
      this.webConfig.plugins = [
        ...(this.webConfig.plugins || []),
        new VueLoaderPlugin()
      ]
    }

    if (this._useBabel) {
      this.webConfig.module.rules.unshift({
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          require.resolve('babel-loader')
        ]
      })
      this.webConfig.resolve.extensions.push('.jsx')
    }

    if (this._useESLint) {
      this.webConfig.module.rules.unshift({
        test: /\.(jsx?|vue)$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [this._createEslintLoader()]
      })
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
          },
          ...(this._createAssetsLoader(config))
        ]
      },
      resolve: {
        alias: {
          '@': getPath('src')
        },
        extensions: ['.ts', '.tsx', '.js', '.vue', '.css', '.styl', '.stylus', '.json']
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

    if (this._useBabel) {
      this.rendererConfig.module.rules.unshift({
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: [
          require.resolve('babel-loader')
        ]
      })
      this.rendererConfig.resolve.extensions.push('.jsx')
    }

    if (this._useESLint) {
      this.rendererConfig.module.rules.unshift({
        test: /\.(jsx?|vue)$/,
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
    if (this._electronTarget) {
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
    } else {
      this.webConfig.devServer = {
        stats: config.statsOptions,
        hot: true,
        host: config.devServerHost,
        inline: true,
        contentBase: [getPath(config.contentBase)],
        publicPath: config.publicPath,
        before (_app, server) {
          server._watch(config.indexHtml)
        }
      }
      this.webConfig.devtool = 'eval-source-map'
      this.webConfig.plugins = [
        ...(this.webConfig.plugins || []),
        new HotModuleReplacementPlugin()
      ]

      if (config.publicPath) {
        this.webConfig.output && (this.webConfig.output.publicPath = config.publicPath)
      }

      if (this._useTypeScript) {
        this.webConfig.plugins = [
          ...(this.webConfig.plugins || []),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: getPath('tsconfig.json'),
            vue: this._useVue
          })
        ]
      }
    }
  }

  _mergeProduction (config) {
    const terser = () => new TerserWebpackPlugin(config.terserPlugin)
    if (this._electronTarget) {
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
    } else {
      this.webConfig.plugins = [
        ...(this.webConfig.plugins || []),
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ]
      this.webConfig.optimization = {
        ...(this.webConfig.optimization || {}),
        minimizer: [
          terser(),
          new OptimizeCSSAssetsPlugin({})
        ]
      }

      if (this._useTypeScript) {
        this.webConfig.plugins = [
          ...(this.webConfig.plugins || []),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: getPath('tsconfig.json'),
            vue: this._useVue,
            async: false,
            useTypescriptIncrementalApi: true,
            memoryLimit: 4096
          })
        ]
      }
    }
  }
}

module.exports = WebpackConfig
