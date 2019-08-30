const { execSync } = require('child_process')
const { existsSync, writeFileSync } = require('fs-extra')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserWebpackPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpackNodeExternals = require('webpack-node-externals')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const PathUtil = require('../util/path.js')
const path = require('path')
const os = require('os')
const { ensureEntry, ensureFile } = require('../util/file.js')

class WebpackConfig {
  _createCssLoaders (config, importLoaders = 0) {
    return [
      config.mode === 'production' ? MiniCssExtractPlugin.loader : (this._useVue ? require.resolve('vue-style-loader') : require.resolve('style-loader')),
      {
        loader: require.resolve('css-loader'),
        options: {
          importLoaders
        }
      }
    ]
  }

  _createStyleLoaders (config) {
    return [
      {
        test: /\.css$/,
        use: [
          ...(this._createCssLoaders(config, this._usePostCss ? 1 : 0)),
          ...(this._usePostCss ? [require.resolve('postcss-loader')] : [])
        ]
      },
      {
        test: /\.styl(us)?$/,
        use: [
          ...(this._createCssLoaders(config, this._usePostCss ? 2 : 1)),
          ...(this._usePostCss ? [require.resolve('postcss-loader')] : []),
          require.resolve('stylus-loader')
        ]
      },
      {
        test: /\.less$/,
        use: [
          ...(this._createCssLoaders(config, this._usePostCss ? 2 : 1)),
          ...(this._usePostCss ? [require.resolve('postcss-loader')] : []),
          require.resolve('less-loader')
        ]
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          ...(this._createCssLoaders(config, this._usePostCss ? 2 : 1)),
          ...(this._usePostCss ? [require.resolve('postcss-loader')] : []),
          {
            loader: require.resolve('sass-loader'),
            options: {
              sourceMap: false,
              indentedSyntax: true
            }
          }
        ]
      }
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

  _createAssetsLoaders (config) {
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
    this.pathUtil = new PathUtil(config.context)
    let pkg
    try {
      pkg = require(this.pathUtil.getPath('package.json'))
    } catch (_) {
      pkg = {
        name: '',
        version: '0.0.0',
        main: '',
        author: '',
        license: '',
        devDependencies: {},
        dependencies: {}
      }
    }
    this.pkg = pkg
    this._useVue = !!((this.pkg.devDependencies && this.pkg.devDependencies.vue) || (this.pkg.dependencies && this.pkg.dependencies.vue))
    this._electronTarget = (config.target === 'electron')

    const existsTypeScriptInPackageJson = !!(this.pkg.devDependencies && this.pkg.devDependencies.typescript)

    if (this._electronTarget) {
      const rendererTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.renderer))
      const mainTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.main))
      this._useTypeScript = config.ts !== undefined ? config.ts : !!(
        existsTypeScriptInPackageJson ||
        rendererTSConfig ||
        mainTSConfig
      )

      if (this._useTypeScript) {
        if (!rendererTSConfig) writeFileSync(this.pathUtil.getPath(config.tsconfig.renderer), '{}' + os.EOL, 'utf8')
        if (!mainTSConfig) writeFileSync(this.pathUtil.getPath(config.tsconfig.main), '{}' + os.EOL, 'utf8')
      }
    } else {
      const webTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.web))
      this._useTypeScript = config.ts !== undefined ? config.ts : !!(existsTypeScriptInPackageJson || webTSConfig)

      if (this._useTypeScript) {
        if (!webTSConfig) writeFileSync(this.pathUtil.getPath(config.tsconfig.web), '{}' + os.EOL, 'utf8')
      }
    }

    this._useESLint = !!((this.pkg.devDependencies && this.pkg.devDependencies.eslint) || (
      existsSync(this.pathUtil.getPath('.eslintrc.js')) ||
      existsSync(this.pathUtil.getPath('.eslintrc.yml')) ||
      existsSync(this.pathUtil.getPath('.eslintrc.yaml')) ||
      existsSync(this.pathUtil.getPath('.eslintrc.json')) ||
      existsSync(this.pathUtil.getPath('.eslintrc')) ||
      (this.pkg.eslintConfig !== undefined)
    ))
    this._useBabel = !!((this.pkg.devDependencies && this.pkg.devDependencies['@babel/core']) || (
      existsSync(this.pathUtil.getPath('babel.config.js')) ||
      existsSync(this.pathUtil.getPath('.babelrc'))
    ))
    this._usePostCss = existsSync(this.pathUtil.getPath('postcss.config.js')) || existsSync(this.pathUtil.getPath('.postcssrc.js'))

    ensureFile(this.pathUtil.getPath(config.indexHtml || 'public/index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${this.pkg.name}</title>
</head>
<body>
</body>
</html>
`)

    const getPath = this.pathUtil.getPath.bind(this.pathUtil)
    if (this._electronTarget) {
      ensureEntry(config.entry && config.entry.main, getPath)
      ensureEntry(config.entry && config.entry.renderer, getPath)

      this._initMain(config)
      this._initRenderer(config)
      this._initProductionPackage(config)
      this._initPackagerConfig(config)
    } else {
      ensureEntry(config.entry && config.entry.web, getPath)

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
      context: this.pathUtil.getPath(),
      target: 'web',
      entry: config.entry.web,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.web)
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
                  configFile: this.pathUtil.getPath(config.tsconfig.web)
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
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: ['.ts', '.tsx', '.js', '.vue', '.css', '.styl', '.stylus', '.less', '.sass', '.scss', '.json', '.wasm']
      },
      plugins: [
        new HtmlWebpackPlugin({
          title: this.pkg.name,
          template: this.pathUtil.getPath(config.indexHtml),
          minify: config.mode === 'production' ? config.htmlMinify : false
        }),
        new CopyWebpackPlugin([
          {
            from: this.pathUtil.getPath('public'),
            to: this.pathUtil.getPath(config.output.web),
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
      context: this.pathUtil.getPath(),
      target: 'electron-main',
      entry: config.entry.main,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.main)
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
                  configFile: this.pathUtil.getPath(config.tsconfig.main)
                }
              }
            ]
          },
          {
            test: /\.node$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('native-addon-loader'),
                options: {
                  name: '[name].[ext]',
                  from: '.'
                }
              }
            ]
          }
        ]
      },
      externals: [webpackNodeExternals()],
      resolve: {
        alias: config.alias,
        extensions: ['.js', '.ts', '.json', '.node']
      },
      plugins: [
        new CopyWebpackPlugin([
          { from: this.pathUtil.getPath('package.json'), to: this.pathUtil.getPath(config.resourcesPath, 'app/package.json') }
        ])
      ]
    }

    if (process.platform === 'linux') {
      this.mainConfig.plugins = [
        ...(this.mainConfig.plugins || []),
        new CopyWebpackPlugin([
          { from: this.pathUtil.getPath(config.iconSrcDir, '1024x1024.png'), to: this.pathUtil.getPath(config.resourcesPath, 'icon/app.png') }
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
      context: this.pathUtil.getPath(),
      target: 'electron-renderer',
      entry: config.entry.renderer,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.renderer)
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
                  configFile: this.pathUtil.getPath(config.tsconfig.renderer)
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
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: ['.ts', '.tsx', '.js', '.vue', '.css', '.styl', '.stylus', '.less', '.sass', '.scss', '.json', '.wasm']
      },
      plugins: [
        new HtmlWebpackPlugin({
          title: this.pkg.name,
          template: this.pathUtil.getPath(config.indexHtml),
          minify: config.mode === 'production' ? config.htmlMinify : false
        }),
        new CopyWebpackPlugin([
          {
            from: this.pathUtil.getPath('public'),
            to: this.pathUtil.getPath(config.output.renderer),
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
    const author = typeof this.pkg.author === 'object' ? this.pkg.author.name : this.pkg.author

    const productionPackage = {
      name: this.pkg.name,
      version: this.pkg.version,
      main: this.pkg.main,
      author,
      license: this.pkg.license
    }

    if (this.pkg.dependencies) {
      productionPackage.dependencies = this.pkg.dependencies
    }

    try {
      productionPackage._commit = execSync('git rev-parse HEAD', { cwd: this.pathUtil.getPath() }).toString().replace(/[\r\n]/g, '')
      productionPackage._commitDate = new Date((execSync('git log -1', { cwd: this.pathUtil.getPath() }).toString().match(/Date:\s*(.*?)\n/))[1]).toISOString()
    } catch (_) {}

    this.productionPackage = productionPackage
  }

  _initPackagerConfig (config) {
    const packagerOptions = {
      dir: this.pathUtil.getPath(),
      out: this.pathUtil.getPath(config.distPath),
      arch: config.arch || process.arch,
      prebuiltAsar: this.pathUtil.getPath(config.distPath, 'resources/app.asar'),
      appCopyright: `Copyright (C) ${new Date().getFullYear()} ${this.productionPackage.author}`,
      overwrite: true
    }

    if (process.env.npm_config_electron_mirror && process.env.npm_config_electron_mirror.indexOf('taobao') !== -1) {
      packagerOptions.download = {
        unsafelyDisableChecksums: true,
        mirrorOptions: {
          mirror: process.env.npm_config_electron_mirror.endsWith('/') ? process.env.npm_config_electron_mirror : (process.env.npm_config_electron_mirror + '/'),
          customDir: this.pkg.devDependencies.electron
        }
      }
    }

    if (process.platform === 'win32') {
      const iconPath = this.pathUtil.getPath(config.iconSrcDir, 'app.ico')
      if (existsSync(iconPath)) {
        packagerOptions.icon = iconPath
      }
    } else if (process.platform === 'darwin') {
      const iconPath = this.pathUtil.getPath(config.iconSrcDir, 'app.icns')
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
        contentBase: [this.pathUtil.getPath(config.contentBase)],
        publicPath: config.publicPath,
        before: (app, server) => {
          app.use(require('express-serve-asar')(this.pathUtil.getPath(config.contentBase)))
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
            tsconfig: this.pathUtil.getPath(config.tsconfig.renderer),
            vue: this._useVue
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.main)
          })
        ]
      }
    } else {
      this.webConfig.devServer = {
        stats: config.statsOptions,
        hot: true,
        host: config.devServerHost,
        inline: true,
        contentBase: [this.pathUtil.getPath(config.contentBase)],
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
            tsconfig: this.pathUtil.getPath(config.tsconfig.web),
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
            tsconfig: this.pathUtil.getPath(config.tsconfig.renderer),
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
            tsconfig: this.pathUtil.getPath(config.tsconfig.main),
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
            tsconfig: this.pathUtil.getPath(config.tsconfig.web),
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
