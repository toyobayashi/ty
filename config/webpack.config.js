const { execSync } = require('child_process')
const { existsSync, mkdirsSync, readJSONSync } = require('fs-extra')
const { HotModuleReplacementPlugin, ProgressPlugin, DefinePlugin, ProvidePlugin } = require('webpack')
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
const merge = require('deepmerge')
const semver = require('semver')

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
      this._extractCss ? {
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

  _createEslintLoader (test) {
    return {
      test,
      enforce: 'pre',
      exclude: /node_modules/,
      use: [{
        loader: require.resolve('eslint-loader'),
        options: {
          emitWarning: true,
          emitError: false
        }
      }]
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
        name: path.posix.join(config.assetsPath || '', dir, config.out.assets)
      }
    }
  }

  _createHtmlPlugins (config) {
    return config.indexHtml.map(htmlOption => {
      if (typeof htmlOption === 'string') {
        return new HtmlWebpackPlugin({
          title: this.pkg.name,
          template: this.pathUtil.getPath(htmlOption),
          minify: config.mode === 'production' ? config.htmlMinify : false,
          cache: false
        })
      }

      return new HtmlWebpackPlugin({
        cache: false,
        ...htmlOption,
        title: htmlOption.title || this.pkg.name,
        template: this.pathUtil.getPath(htmlOption.template),
        minify: config.mode === 'production' ? (htmlOption.minify || config.htmlMinify) : false,
      })
    })
  }

  _createDefinePlugin (config) {
    return new DefinePlugin({
      ...(config.define || {})
    })
  }

  _watchHtml (config, server) {
    for (let i = 0; i < config.indexHtml.length; i++) {
      const item = config.indexHtml[i]
      const tpl = typeof item === 'string' ? item : item.template
      server._watch(this.pathUtil.getPath(tpl))
    }
  }

  _createBaseOptimization () {
    return {
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

  _createCommonTSLoader (tsconfig) {
    return {
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
            configFile: this.pathUtil.getPath(tsconfig)
          }
        }
      ]
    }
  }

  _createNodeLoader (config) {
    return {
      test: /\.node$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('native-addon-loader'),
          options: {
            name: config.out.node,
            from: '.'
          }
        }
      ]
    }
  }

  _createTypeScriptHelperProvidePlugin () {
    const typescript = (this.pkg.devDependencies && this.pkg.devDependencies.typescript) || (this.pkg.dependencies && this.pkg.dependencies.typescript)
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

  _createNodeBaseRules (tsconfig, config) {
    return [
      this._createCommonTSLoader(tsconfig),
      this._createNodeLoader(config)
    ]
  }

  _createTSXLoader (config, tsconfig) {
    return [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('ts-loader'),
            options: {
              appendTsSuffixTo: [/\.vue$/],
              transpileOnly: true,
              configFile: this.pathUtil.getPath(config.tsconfig[tsconfig])
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
              configFile: this.pathUtil.getPath(config.tsconfig[tsconfig])
            }
          }
        ]
      }
    ]
  }

  _createCopyPlugin (config, output) {
    const from = this.pathUtil.getPath(config.staticDir || 'public')
    const to = this.pathUtil.getPath(config.output[output])
    return (existsSync(from) ? [new CopyWebpackPlugin({
      patterns: [
        {
          from,
          to,
          toType: 'dir',
          globOptions: {
            ignore: [
              '**/.gitkeep',
              '**/.DS_Store'
            ]
          },
          noErrorOnMissing: true
        }
      ]
    })] : [])
  }

  _createVueLoader () {
    return {
      test: /\.vue$/,
      use: [
        require.resolve('vue-loader')
      ]
    }
  }

  _insertVueLoaderPlugin (webpackConfig) {
    const { VueLoaderPlugin } = require('vue-loader')
    if (Array.isArray(webpackConfig.plugins)) {
      webpackConfig.plugins.push(new VueLoaderPlugin())
    } else {
      webpackConfig.plugins = [new VueLoaderPlugin()]
    }
  }

  _defaultNodeLib () {
    return {
      setImmediate: false,
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    }
  }

  _createBabelLoader (test) {
    return {
      test,
      exclude: /node_modules/,
      use: [
        require.resolve('babel-loader')
      ]
    }
  }

  _createDevServerConfig (config, before) {
    return {
      stats: config.statsOptions,
      hot: true,
      host: config.devServerHost,
      inline: true,
      ...(this._webTarget ? { open: config.devServerOpenBrowser } : {}),
      contentBase: [this.pathUtil.getPath(config.contentBase)],
      publicPath: config.publicPath,
      ...(config.proxy ? { proxy: config.proxy } : {}),
      ...(typeof before === 'function' ? { before } : {})
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
    this._extractCss = config.extractcss !== undefined ? !!config.extractcss : (config.mode === 'production')

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
      const baseFilename = 'tsconfig.base.json'
      let jsx = 'react'
      if (this._useBabel && this._useVue) {
        jsx = 'preserve'
      }
      if (this._electronTarget) {
        const rendererTarget = this.pathUtil.getPath(config.tsconfig.renderer)
        const mainTarget = this.pathUtil.getPath(config.tsconfig.main)
        const preloadTarget = this.pathUtil.getPath(config.tsconfig.preload)
        const usePreload = !!(config.entry.preload && !tsconfigFileExists.preloadTSConfig)
        if (!tsconfigFileExists.rendererTSConfig) {
          copyTemplate(templateFilename, rendererTarget, { jsx, target: 'es2019', include: './**/*', ext: '../../tsconfig.base.json' })
        }
        if (!tsconfigFileExists.mainTSConfig) {
          copyTemplate(templateFilename, mainTarget, { jsx: '', target: 'es2019', include: './**/*', ext: '../../tsconfig.base.json' })
        }
        if (usePreload) {
          copyTemplate(templateFilename, preloadTarget, { jsx, target: 'es2019', include: './**/*', ext: '../../tsconfig.base.json' })
        }

        const rendererBase = readJSONSync(rendererTarget).extends
        const mainBase = readJSONSync(mainTarget).extends
        if (typeof rendererBase === 'string') {
          const t = path.join(path.dirname(rendererTarget), rendererBase)
          if (!existsSync(t)) copyTemplate(baseFilename, t)
        }
        if (typeof mainBase === 'string') {
          const t = path.join(path.dirname(mainTarget), mainBase)
          if (!existsSync(t)) copyTemplate(baseFilename, t)
        }

        if (usePreload) {
          const preloadBase = readJSONSync(preloadTarget).extends
          if (typeof preloadBase === 'string') {
            const t = path.join(path.dirname(preloadTarget), preloadBase)
            if (!existsSync(t)) copyTemplate(baseFilename, t)
          }
        }
      } else if (this._nodeTarget) {
        const nodeTarget = this.pathUtil.getPath(config.tsconfig.node)
        if (!tsconfigFileExists.nodeTSConfig) {
          copyTemplate(templateFilename, nodeTarget, { jsx: '', target: 'es2019', include: './src/**/*', ext: './tsconfig.base.json' })
        }
        const nodeBase = readJSONSync(nodeTarget).extends
        if (typeof nodeBase === 'string') {
          const t = path.join(path.dirname(nodeTarget), nodeBase)
          if (!existsSync(t)) copyTemplate(baseFilename, t)
        }
      } else {
        const webTarget = this.pathUtil.getPath(config.tsconfig.web)
        if (!tsconfigFileExists.webTSConfig) {
          copyTemplate(templateFilename, webTarget, { jsx, target: 'es5', include: './src/**/*', ext: './tsconfig.base.json' })
        }
        const webBase = readJSONSync(webTarget).extends
        if (typeof webBase === 'string') {
          const t = path.join(path.dirname(webTarget), webBase)
          if (!existsSync(t)) copyTemplate(baseFilename, t)
        }
      }
    }

    if (!this._nodeTarget) {
      for (let i = 0; i < config.indexHtml.length; i++) {
        const item = config.indexHtml[i]
        const tpl = typeof item === 'string' ? item : item.template
        const html = this.pathUtil.getPath(tpl)
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
        copyTemplate('npmrc.txt', npmrc, { version: this.pkg.devDependencies.electron.replace(/[~^]/g, '') })
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
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.node),
        libraryTarget: 'commonjs2'
      },
      node: false,
      module: {
        rules: [
          ...(this._useESLint ? [this._createEslintLoader(/\.jsx?$/)] : []),
          ...(this._createNodeBaseRules(config.tsconfig.node, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals)],
      resolve: {
        alias: config.alias,
        extensions: ['.tsx', '.ts', '.mjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        this._createDefinePlugin(config),
        ...(config.progress ? [new ProgressPlugin()] : [])
      ]
    }
  }

  _initWeb (config) {
    this.webConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'web',
      entry: config.entry.web,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.web)
      },
      node: this._defaultNodeLib(),
      module: {
        rules: [
          ...(this._useESLint ? [this._createEslintLoader(/\.(jsx?|vue)$/)] : []),
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._createTSXLoader(config, 'web')),
          this._createVueLoader(),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: ['.tsx', '.ts', '.mjs', '.js', ...(this._useBabel ? ['.jsx'] : []), '.vue', '.styl', '.stylus', '.less', '.sass', '.scss', '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._createHtmlPlugins(config)),
        ...(this._createCopyPlugin(config, 'web')),
        this._createDefinePlugin(config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(this._extractCss ? [new MiniCssExtractPlugin({ filename: config.out.css })] : [])
      ],
      optimization: this._createBaseOptimization()
    }

    if (this._useVue) {
      this._insertVueLoaderPlugin(this.webConfig)
    }
  }

  _initMain (config) {
    this.mainConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'electron-main',
      entry: config.entry.main,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.main),
        libraryTarget: 'commonjs2'
      },
      node: false,
      module: {
        rules: [
          ...(this._useESLint ? [this._createEslintLoader(/\.jsx?$/)] : []),
          ...(this._createNodeBaseRules(config.tsconfig.main, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals)],
      resolve: {
        alias: config.alias,
        extensions: ['.tsx', '.ts', '.mjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: [
            { from: this.pathUtil.getPath('package.json'), to: this.pathUtil.getPath(config.localResourcesPath, 'app/package.json') }
          ]
        }),
        this._createDefinePlugin(config),
        ...(config.progress ? [new ProgressPlugin()] : [])
      ]
    }

    if (process.platform === 'linux') {
      this.mainConfig.plugins = [
        ...(this.mainConfig.plugins || []),
        new CopyWebpackPlugin({
          patterns: [
            { from: this.pathUtil.getPath(config.iconSrcDir, '1024x1024.png'), to: this.pathUtil.getPath(config.localResourcesPath, 'icon/app.png') }
          ]
        })
      ]
    }
  }

  _initRenderer (config) {
    this.rendererConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: config.entry.preload ? 'web' : 'electron-renderer',
      entry: config.entry.renderer,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.renderer)
      },
      node: config.entry.preload ? this._defaultNodeLib() : false,
      module: {
        rules: [
          ...(this._useESLint ? [this._createEslintLoader(/\.(jsx?|vue)$/)] : []),
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._createTSXLoader(config, 'renderer')),
          this._createVueLoader(),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: ['.tsx', '.ts', '.mjs', '.js', ...(this._useBabel ? ['.jsx'] : []), '.vue', '.styl', '.stylus', '.less', '.sass', '.scss', '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._createHtmlPlugins(config)),
        ...(this._createCopyPlugin(config, 'renderer')),
        this._createDefinePlugin(config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(this._extractCss ? [new MiniCssExtractPlugin({ filename: config.out.css })] : [])
      ],
      optimization: this._createBaseOptimization()
    }

    if (this._useVue) {
      this._insertVueLoaderPlugin(this.rendererConfig)
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
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.preload),
        libraryTarget: 'commonjs2'
      },
      node: false,
      externals: [webpackNodeExternals(config.nodeExternals)],
      module: {
        rules: [
          ...(this._useESLint ? [this._createEslintLoader(/\.(jsx?|vue)$/)] : []),
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._createTSXLoader(config, 'preload')),
          this._createVueLoader(),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: ['.tsx', '.ts', '.mjs', '.js', ...(this._useBabel ? ['.jsx'] : []), '.vue', '.styl', '.stylus', '.less', '.sass', '.scss', '.css', '.json', '.wasm']
      },
      plugins: [
        this._createDefinePlugin(config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(this._extractCss ? [new MiniCssExtractPlugin({ filename: config.out.css })] : [])
      ]
    }

    if (this._useVue) {
      this._insertVueLoaderPlugin(this.preloadConfig)
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
    let packagerOptions = {
      dir: this.pathUtil.getPath(),
      out: this.pathUtil.getPath(config.distPath),
      arch: config.arch || process.arch,
      electronVersion: this.pkg.devDependencies.electron.replace(/[~^]/g, ''),
      prebuiltAsar: this.pathUtil.getPath(config.distPath, 'resources/app.asar'),
      overwrite: true
    }

    if (this.productionPackage.author) {
      packagerOptions.appCopyright = `Copyright (C) ${new Date().getFullYear()} ${this.productionPackage.author}`
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

    packagerOptions = merge(packagerOptions, config.packagerOptions)

    this.packagerConfig = packagerOptions
  }

  _mergeDevelopment (config) {
    if (this._electronTarget) {
      this.rendererConfig.devServer = this._createDevServerConfig(config, (app, server) => {
        app.use(require('express-serve-asar')(this.pathUtil.getPath(config.contentBase)))
        this._watchHtml(config, server)
      })

      this.rendererConfig.devtool = this.mainConfig.devtool = config.devtool.development
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
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.renderer),
            vue: this._useVue
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.main)
          })
        ]
      }

      if (config.entry.preload) {
        this.preloadConfig.devtool = config.devtool.development
        if (config.publicPath) {
          this.preloadConfig.output && (this.preloadConfig.output.publicPath = config.publicPath)
        }
        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            ...(this._createTypeScriptHelperProvidePlugin()),
            new ForkTsCheckerWebpackPlugin({
              eslint: this._useESLint,
              tsconfig: this.pathUtil.getPath(config.tsconfig.preload),
              vue: this._useVue
            })
          ]
        }
      }
    } else if (this._nodeTarget) {
      this.nodeConfig.devtool = config.devtool.development
      if (this._useTypeScript) {
        this.nodeConfig.plugins = [
          ...(this.nodeConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.node)
          })
        ]
      }
    } else {
      this.webConfig.devServer = this._createDevServerConfig(config, (_app, server) => {
        this._watchHtml(config, server)
      })

      this.webConfig.devtool = config.devtool.development
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
          ...(this._createTypeScriptHelperProvidePlugin()),
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
          ...(this._createTypeScriptHelperProvidePlugin()),
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
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.main),
            async: false,
            useTypescriptIncrementalApi: true,
            memoryLimit: 4096
          })
        ]
      }
      if (config.productionSourcemap) this.rendererConfig.devtool = this.mainConfig.devtool = config.devtool.production

      if (config.entry.preload) {
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
            ...(this._createTypeScriptHelperProvidePlugin()),
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
        if (config.productionSourcemap) this.preloadConfig.devtool = config.devtool.production
      }
    } else if (this._nodeTarget) {
      this.nodeConfig.optimization = {
        ...(this.nodeConfig.optimization || {}),
        minimizer: [terser()]
      }

      if (this._useTypeScript) {
        this.nodeConfig.plugins = [
          ...(this.nodeConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            eslint: this._useESLint,
            tsconfig: this.pathUtil.getPath(config.tsconfig.node),
            async: false,
            useTypescriptIncrementalApi: true,
            memoryLimit: 4096
          })
        ]
      }
      if (config.productionSourcemap) this.nodeConfig.devtool = config.devtool.production
    } else {
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
          ...(this._createTypeScriptHelperProvidePlugin()),
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

      if (config.productionSourcemap) this.webConfig.devtool = config.devtool.production
    }
  }
}

module.exports = WebpackConfig
