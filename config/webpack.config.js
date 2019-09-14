const { execSync } = require('child_process')
const { existsSync, mkdirsSync } = require('fs-extra')
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
const { ensureEntry, copyTemplate } = require('../util/file.js')

class WebpackConfig {
  _createCssLoaders (config, importLoaders = 0, cssModule = false) {
    const cssLoaderOptions = {
      sourceMap: config.mode === 'production' ? !!config.productionSourcemap : false,
      importLoaders: (this._usePostCss ? 1 : 0) + importLoaders
    }

    if (cssModule) {
      cssLoaderOptions.module = true
      cssLoaderOptions.localIdentName = '[name]_[local]_[hash:base64:5]'
    }
    return [
      config.mode === 'production' ? {
        loader: MiniCssExtractPlugin.loader,
        options: {
          sourceMap: !!config.productionSourcemap
        }
      } : (this._useVue ? require.resolve('vue-style-loader') : require.resolve('style-loader')),
      {
        loader: require.resolve('css-loader'),
        options: {
          ...cssLoaderOptions,
          ...(Object.prototype.toString.call(config.cssLoaderOptions) === '[object Object]' ? config.cssLoaderOptions : {})
        }
      },
      ...(this._usePostCss ? [this._createPostCssLoader(config)] : [])
    ]
  }

  _createPostCssLoader (config) {
    return {
      loader: require.resolve('postcss-loader'),
      options: {
        sourceMap: config.mode === 'production' ? !!config.productionSourcemap : false
      }
    }
  }

  _createStylusLoader (config) {
    return {
      loader: require.resolve('stylus-loader'),
      options: {
        sourceMap: config.mode === 'production' ? !!config.productionSourcemap : false,
        preferPathResolver: 'webpack'
      }
    }
  }

  _createLessLoader (config) {
    return {
      loader: require.resolve('less-loader'),
      options: {
        sourceMap: config.mode === 'production' ? !!config.productionSourcemap : false
      }
    }
  }

  _createSassLoader (config) {
    return {
      loader: require.resolve('sass-loader'),
      options: {
        sourceMap: config.mode === 'production' ? !!config.productionSourcemap : false,
        indentedSyntax: true
      }
    }
  }

  _createStyleLoaders (config) {
    return [
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /module/,
            use: [
              ...(this._createCssLoaders(config, 0, true))
            ]
          },
          {
            test: /\.module\.\w+$/,
            use: [
              ...(this._createCssLoaders(config, 0, true))
            ]
          },
          {
            use: [
              ...(this._createCssLoaders(config, 0, !!config.cssModule))
            ]
          }
        ]
      },
      {
        test: /\.styl(us)?$/,
        oneOf: [
          {
            resourceQuery: /module/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createStylusLoader(config)
            ]
          },
          {
            test: /\.module\.\w+$/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createStylusLoader(config)
            ]
          },
          {
            use: [
              ...(this._createCssLoaders(config, 1, !!config.cssModule)),
              this._createStylusLoader(config)
            ]
          }
        ]
      },
      {
        test: /\.less$/,
        oneOf: [
          {
            resourceQuery: /module/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createLessLoader(config)
            ]
          },
          {
            test: /\.module\.\w+$/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createLessLoader(config)
            ]
          },
          {
            use: [
              ...(this._createCssLoaders(config, 1, !!config.cssModule)),
              this._createLessLoader(config)
            ]
          }
        ]
      },
      {
        test: /\.s[ac]ss$/i,
        oneOf: [
          {
            resourceQuery: /module/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createSassLoader(config)
            ]
          },
          {
            test: /\.module\.\w+$/,
            use: [
              ...(this._createCssLoaders(config, 1, true)),
              this._createSassLoader(config)
            ]
          },
          {
            use: [
              ...(this._createCssLoaders(config, 1, !!config.cssModule)),
              this._createSassLoader(config)
            ]
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

  constructor (config, generate = true) {
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
        devDependencies: {
          ...(config.target === 'electron' ? ({
            electron: '4.2.10'
          }) : ({}))
        },
        dependencies: {}
      }
    }
    this.pkg = pkg
    this._useVue = !!((this.pkg.devDependencies && this.pkg.devDependencies.vue) || (this.pkg.dependencies && this.pkg.dependencies.vue))
    this._electronTarget = (config.target === 'electron')
    this._webTarget = (config.target === 'web')
    this._nodeTarget = (config.target === 'node')

    const existsTypeScriptInPackageJson = !!(this.pkg.devDependencies && this.pkg.devDependencies.typescript)
    const tsconfigFileExists = {
      rendererTSConfig: false,
      mainTSConfig: false,
      preloadTSConfig: false,
      nodeTSConfig: false,
      webTSConfig: false
    }

    if (this._electronTarget) {
      tsconfigFileExists.rendererTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.renderer))
      tsconfigFileExists.mainTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.main))
      tsconfigFileExists.preloadTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.preload))
      this._useTypeScript = config.ts !== undefined ? !!config.ts : !!(
        existsTypeScriptInPackageJson ||
        tsconfigFileExists.rendererTSConfig ||
        tsconfigFileExists.mainTSConfig ||
        tsconfigFileExists.preloadTSConfig
      )
    } else if (this._nodeTarget) {
      tsconfigFileExists.nodeTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.node))
      this._useTypeScript = config.ts !== undefined ? !!config.ts : !!(existsTypeScriptInPackageJson || tsconfigFileExists.nodeTSConfig)
    } else {
      tsconfigFileExists.webTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.web))
      this._useTypeScript = config.ts !== undefined ? !!config.ts : !!(existsTypeScriptInPackageJson || tsconfigFileExists.webTSConfig)
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

    if (config.generate !== undefined ? !!config.generate : generate) {
      this._generateTemplates(config, tsconfigFileExists)
    }

    this._initConfig(config)

    if (config.mode === 'production') {
      this._mergeProduction(config)
    } else {
      this._mergeDevelopment(config)
    }

    if (config.configureWebpack) {
      this._configureWebpack(config)
    }
  }

  _initConfig (config) {
    if (this._electronTarget) {
      this._initMain(config)
      this._initPreload(config)
      this._initRenderer(config)
      this._initProductionPackage(config)
      this._initPackagerConfig(config)
    } else if (this._nodeTarget) {
      this._initNode(config)
    } else {
      this._initWeb(config)
    }
  }

  _configureWebpack (config) {
    if (this._electronTarget) {
      if (typeof config.configureWebpack.renderer === 'function') config.configureWebpack.renderer(this.rendererConfig)
      if (typeof config.configureWebpack.preload === 'function') config.configureWebpack.preload(this.preloadConfig)
      if (typeof config.configureWebpack.main === 'function') config.configureWebpack.main(this.mainConfig)
    } else if (this._nodeTarget) {
      if (typeof config.configureWebpack.node === 'function') config.configureWebpack.node(this.nodeConfig)
    } else {
      if (typeof config.configureWebpack.web === 'function') config.configureWebpack.web(this.webConfig)
    }
  }

  _generateTemplates (config, tsconfigFileExists) {
    if (this._useTypeScript) {
      const templateFilename = 'tsconfig.json'
      let jsx = 'react'
      if (this._useBabel && this._useVue) {
        jsx = 'preserve'
      }
      if (this._electronTarget) {
        if (!tsconfigFileExists.rendererTSConfig) copyTemplate(templateFilename, this.pathUtil.getPath(config.tsconfig.renderer), { jsx, module: 'esnext', target: 'es2018', baseUrl: '../..' })
        if (!tsconfigFileExists.mainTSConfig) copyTemplate(templateFilename, this.pathUtil.getPath(config.tsconfig.main), { jsx: '', module: 'esnext', target: 'es2018', baseUrl: '../..' })
        if (config.entry.preload && !tsconfigFileExists.preloadTSConfig) copyTemplate(templateFilename, this.pathUtil.getPath(config.tsconfig.preload), { jsx, module: 'esnext', target: 'es2018', baseUrl: '../..' })
      } else if (this._nodeTarget) {
        if (!tsconfigFileExists.nodeTSConfig) copyTemplate(templateFilename, this.pathUtil.getPath(config.tsconfig.node), { jsx: '', module: 'esnext', target: 'es2018', baseUrl: '.' })
      } else {
        if (!tsconfigFileExists.webTSConfig) copyTemplate(templateFilename, this.pathUtil.getPath(config.tsconfig.web), { jsx, module: 'esnext', target: 'es5', baseUrl: '.' })
      }
    }

    if (!this._nodeTarget) {
      for (let i = 0; i < config.indexHtml.length; i++) {
        const html = this.pathUtil.getPath(config.indexHtml[i].template)
        if (!existsSync(html)) {
          mkdirsSync(path.dirname(html))
          copyTemplate('index.html', html, { title: this.pkg.name })
        }
      }
    }

    const getPath = this.pathUtil.getPath.bind(this.pathUtil)
    const suffix = this._useTypeScript ? '.ts' : '.js'
    const tplOptions = {
      host: config.devServerHost,
      port: config.devServerPort,
      publicPath: config.publicPath
    }

    if (this._electronTarget) {
      ensureEntry(config.entry && config.entry.main, getPath, suffix, 'index.main' + suffix, tplOptions)
      ensureEntry(config.entry && config.entry.renderer, getPath, suffix, 'index.web.js')
      ensureEntry(config.entry && config.entry.preload, getPath, suffix, 'index.preload.js')
      const npmrc = this.pathUtil.getPath('.npmrc')
      if (!existsSync(npmrc)) {
        mkdirsSync(path.dirname(npmrc))
        copyTemplate('.npmrc', npmrc, { version: this.pkg.devDependencies.electron.replace(/[~^]/g, '') })
      }
    } else if (this._nodeTarget) {
      ensureEntry(config.entry && config.entry.node, getPath, suffix, 'index.node.js')
    } else {
      ensureEntry(config.entry && config.entry.web, getPath, suffix, 'index.web.js')
    }
  }

  _initNode (config) {
    this.nodeConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'node',
      entry: config.entry.node,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.node),
        libraryTarget: 'commonjs2'
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
                  configFile: this.pathUtil.getPath(config.tsconfig.node)
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
      }
    }

    if (this._useESLint) {
      this.nodeConfig.module.rules.unshift({
        test: /\.jsx?$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [this._createEslintLoader()]
      })
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
            test: /\.ts$/,
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
            test: /\.tsx$/,
            exclude: /node_modules/,
            use: [
              ...((this._useBabel && this._useVue) ? [require.resolve('babel-loader')] : []),
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
        ...config.indexHtml.map(htmlOption => {
          return new HtmlWebpackPlugin({
            ...htmlOption,
            title: htmlOption.title || this.pkg.name,
            template: this.pathUtil.getPath(htmlOption.template),
            minify: config.mode === 'production' ? (htmlOption.minify || config.htmlMinify) : false
          })
        }),
        new CopyWebpackPlugin([
          {
            from: this.pathUtil.getPath(config.staticDir || 'public'),
            to: this.pathUtil.getPath(config.output.web),
            toType: 'dir',
            ignore: [
              '.gitkeep',
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
        path: this.pathUtil.getPath(config.output.main),
        libraryTarget: 'commonjs2'
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
      target: config.entry.preload ? 'web' : 'electron-renderer',
      entry: config.entry.renderer,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.renderer)
      },
      node: config.entry.preload ? {
        setImmediate: false,
        dgram: 'empty',
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty'
      } : false,
      module: {
        rules: [
          {
            test: /\.ts$/,
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
            test: /\.tsx$/,
            exclude: /node_modules/,
            use: [
              ...((this._useBabel && this._useVue) ? [require.resolve('babel-loader')] : []),
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
        ...config.indexHtml.map(htmlOption => {
          return new HtmlWebpackPlugin({
            ...htmlOption,
            title: htmlOption.title || this.pkg.name,
            template: this.pathUtil.getPath(htmlOption.template),
            minify: config.mode === 'production' ? (htmlOption.minify || config.htmlMinify) : false
          })
        }),
        new CopyWebpackPlugin([
          {
            from: this.pathUtil.getPath(config.staticDir || 'public'),
            to: this.pathUtil.getPath(config.output.renderer),
            toType: 'dir',
            ignore: [
              '.gitkeep',
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

  _initPreload (config) {
    if (!config.entry.preload) {
      this.preloadConfig = null
      return
    }
    this.preloadConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'electron-renderer',
      entry: config.entry.preload,
      output: {
        filename: '[name].js',
        path: this.pathUtil.getPath(config.output.preload),
        libraryTarget: 'commonjs2'
      },
      node: false,
      externals: [webpackNodeExternals()],
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('ts-loader'),
                options: {
                  appendTsSuffixTo: [/\.vue$/],
                  transpileOnly: true,
                  configFile: this.pathUtil.getPath(config.tsconfig.preload)
                }
              }
            ]
          },
          {
            test: /\.tsx$/,
            exclude: /node_modules/,
            use: [
              ...((this._useBabel && this._useVue) ? [require.resolve('babel-loader')] : []),
              {
                loader: require.resolve('ts-loader'),
                options: {
                  appendTsSuffixTo: [/\.vue$/],
                  transpileOnly: true,
                  configFile: this.pathUtil.getPath(config.tsconfig.preload)
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
      }
    }

    if (this._useVue) {
      const { VueLoaderPlugin } = require('vue-loader')
      this.preloadConfig.plugins = [
        ...(this.preloadConfig.plugins || []),
        new VueLoaderPlugin()
      ]
    }

    if (this._useBabel) {
      this.preloadConfig.module.rules.unshift({
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: [
          require.resolve('babel-loader')
        ]
      })
      this.preloadConfig.resolve.extensions.push('.jsx')
    }

    if (this._useESLint) {
      this.preloadConfig.module.rules.unshift({
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
      electronVersion: this.pkg.devDependencies.electron.replace(/[~^]/g, ''),
      prebuiltAsar: this.pathUtil.getPath(config.distPath, 'resources/app.asar'),
      appCopyright: `Copyright (C) ${new Date().getFullYear()} ${this.productionPackage.author}`,
      overwrite: true
    }

    if (process.env.npm_config_electron_mirror && process.env.npm_config_electron_mirror.indexOf('taobao') !== -1) {
      packagerOptions.download = {
        unsafelyDisableChecksums: true,
        mirrorOptions: {
          mirror: process.env.npm_config_electron_mirror.endsWith('/') ? process.env.npm_config_electron_mirror : (process.env.npm_config_electron_mirror + '/'),
          customDir: this.pkg.devDependencies.electron.replace(/[~^]/g, '')
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
          for (let i = 0; i < config.indexHtml.length; i++) {
            server._watch(this.pathUtil.getPath(config.indexHtml[i].template))
          }
        }
      }
      if (config.proxy) this.rendererConfig.devServer.proxy = config.proxy
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

      if (config.entry.preload) {
        this.preloadConfig.devtool = 'eval-source-map'
        if (config.publicPath) {
          this.preloadConfig.output && (this.preloadConfig.output.publicPath = config.publicPath)
        }
        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            new ForkTsCheckerWebpackPlugin({
              eslint: this._useESLint,
              tsconfig: this.pathUtil.getPath(config.tsconfig.preload),
              vue: this._useVue
            })
          ]
        }
      }
    } else if (this._nodeTarget) {
      this.nodeConfig.devtool = 'eval-source-map'
      if (this._useTypeScript) {
        this.nodeConfig.plugins = [
          ...(this.nodeConfig.plugins || []),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.node)
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
        before: (_app, server) => {
          for (let i = 0; i < config.indexHtml.length; i++) {
            server._watch(this.pathUtil.getPath(config.indexHtml[i].template))
          }
        }
      }
      if (config.proxy) this.webConfig.devServer.proxy = config.proxy
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
    const terser = () => {
      if (config.productionSourcemap) {
        config.terserPlugin.sourceMap = true
      }
      return new TerserWebpackPlugin(config.terserPlugin)
    }

    const cssnano = () => {
      const option = config.cssOptimize || {}
      if (config.productionSourcemap) {
        option.cssProcessorOptions ? (
          option.cssProcessorOptions.map ? (
            option.cssProcessorOptions.map.inline = false
          ) : (
            option.cssProcessorOptions.map = { inline: false }
          )
        ) : (option.cssProcessorOptions = {
          map: { inline: false }
        })
      }

      return new OptimizeCSSAssetsPlugin(option)
    }

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
          cssnano()
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
      if (config.productionSourcemap) this.rendererConfig.devtool = this.mainConfig.devtool = 'source-map'

      if (config.entry.preload) {
        this.preloadConfig.plugins = [
          ...(this.preloadConfig.plugins || []),
          new MiniCssExtractPlugin({
            filename: '[name].css'
          })
        ]
        this.preloadConfig.optimization = {
          ...(this.preloadConfig.optimization || {}),
          minimizer: [
            terser(),
            cssnano()
          ]
        }
        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            new ForkTsCheckerWebpackPlugin({
              eslint: this._useESLint,
              tsconfig: this.pathUtil.getPath(config.tsconfig.preload),
              vue: this._useVue,
              async: false,
              useTypescriptIncrementalApi: true,
              memoryLimit: 4096
            })
          ]
        }
        if (config.productionSourcemap) this.preloadConfig.devtool = 'source-map'
      }
    } else if (this._nodeTarget) {
      this.nodeConfig.optimization = {
        ...(this.nodeConfig.optimization || {}),
        minimizer: [terser()]
      }

      if (this._useTypeScript) {
        this.nodeConfig.plugins = [
          ...(this.nodeConfig.plugins || []),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.node),
            async: false,
            useTypescriptIncrementalApi: true,
            memoryLimit: 4096
          })
        ]
      }
      if (config.productionSourcemap) this.nodeConfig.devtool = 'source-map'
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
          cssnano()
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

      if (config.productionSourcemap) this.webConfig.devtool = 'source-map'
    }
  }
}

module.exports = WebpackConfig
