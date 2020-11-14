const { execSync } = require('child_process')
const { existsSync, mkdirsSync, readJSONSync } = require('fs-extra')
const webpackNodeExternals = require('webpack-node-externals')
const wrapPlugin = require('../util/plugin.js')

const webpack = require('webpack')
const HotModuleReplacementPlugin = wrapPlugin('webpack.HotModuleReplacementPlugin', webpack.HotModuleReplacementPlugin)
const ProgressPlugin = wrapPlugin('webpack.ProgressPlugin', webpack.ProgressPlugin)
const DefinePlugin = wrapPlugin('webpack.DefinePlugin', webpack.DefinePlugin)
const ProvidePlugin = wrapPlugin('webpack.ProvidePlugin', webpack.ProvidePlugin)

const EslintWebpackPlugin = wrapPlugin('EslintWebpackPlugin', require('eslint-webpack-plugin'))
const HtmlWebpackPlugin = wrapPlugin('HtmlWebpackPlugin', require('html-webpack-plugin'))
const CssMinimizerWebpackPlugin = wrapPlugin('CssMinimizerWebpackPlugin', require('css-minimizer-webpack-plugin'))
const TerserWebpackPlugin = wrapPlugin('TerserWebpackPlugin', require('terser-webpack-plugin'))
const MiniCssExtractPlugin = wrapPlugin('MiniCssExtractPlugin', require('mini-css-extract-plugin'))
const CopyWebpackPlugin = wrapPlugin('CopyWebpackPlugin', require('copy-webpack-plugin'))
const ForkTsCheckerWebpackPlugin = wrapPlugin('ForkTsCheckerWebpackPlugin', require('fork-ts-checker-webpack-plugin'))

const PathUtil = require('../util/path.js')
const path = require('path')
const { ensureEntry, copyTemplate } = require('../util/file.js')
const merge = require('deepmerge')
const semver = require('semver')

class WebpackConfig {
  _createCssLoaders (config, importLoaders = 0) {
    const cssLoaderOptions = {
      modules: {
        auto: true,
        localIdentName: config.mode === 'production' ? '[hash:base64]' : '[path][name]__[local]'
      },
      importLoaders: (this._usePostCss ? 1 : 0) + importLoaders
    }

    return [
      this._extractCss
        ? { loader: MiniCssExtractPlugin.loader }
        : { loader: require.resolve('style-loader') },
      {
        loader: require.resolve('css-loader'),
        options: merge(cssLoaderOptions, (typeof config.cssLoaderOptions === 'object' && config.cssLoaderOptions !== null) ? config.cssLoaderOptions : {})
      },
      ...(this._usePostCss ? [this._createPostCssLoader(config)] : [])
    ]
  }

  _createPostCssLoader (config) {
    return {
      loader: require.resolve('postcss-loader'),
      ...((typeof config.postcssLoaderOptions === 'object' && config.postcssLoaderOptions !== null) ? { options: config.postcssLoaderOptions } : {})
    }
  }

  _createStylusLoader (config) {
    return {
      loader: require.resolve('stylus-loader'),
      ...((typeof config.stylusLoaderOptions === 'object' && config.stylusLoaderOptions !== null) ? { options: config.stylusLoaderOptions } : {})
    }
  }

  _createLessLoader (config) {
    return {
      loader: require.resolve('less-loader'),
      ...((typeof config.lessLoaderOptions === 'object' && config.lessLoaderOptions !== null) ? { options: config.lessLoaderOptions } : {})
    }
  }

  _createSassLoader (config) {
    return {
      loader: require.resolve('sass-loader'),
      ...((typeof config.sassLoaderOptions === 'object' && config.sassLoaderOptions !== null) ? { options: config.sassLoaderOptions } : {})
    }
  }

  _createStyleLoaders (config) {
    return [
      {
        test: /\.css$/,
        use: this._createCssLoaders(config, 0)
      },
      ...(this._useStylus
        ? [{
            test: /\.styl(us)?$/,
            use: [
              ...(this._createCssLoaders(config, 1)),
              this._createStylusLoader(config)
            ]
          }]
        : []),
      ...(this._useLess
        ? [{
            test: /\.less$/,
            use: [
              ...(this._createCssLoaders(config, 1)),
              this._createLessLoader(config)
            ]
          }]
        : []),
      ...(this._useSass
        ? [{
            test: /\.s[ac]ss$/i,
            use: [
              ...(this._createCssLoaders(config, 1)),
              this._createSassLoader(config)
            ]
          }]
        : [])
    ]
  }

  _createEslintPlugin (config, extensions) {
    return new EslintWebpackPlugin({
      extensions,
      emitWarning: true,
      emitError: false,
      ...(typeof config.eslintPluginOptions === 'object' && config.eslintPluginOptions !== null ? config.eslintPluginOptions : {})
    })
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
        minify: config.mode === 'production' ? (htmlOption.minify || config.htmlMinify) : false
      })
    })
  }

  _createDefinePlugin (config) {
    return new DefinePlugin({
      ...(this._useTypeScript
        ? {
            __classPrivateFieldGet: ['tslib', '__classPrivateFieldGet'],
            __classPrivateFieldSet: ['tslib', '__classPrivateFieldSet']
          }
        : {}),
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
      ...(this._useTypeScript ? [this._createCommonTSLoader(tsconfig)] : []),
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
              ...(this._useVue ? { appendTsSuffixTo: [/\.vue$/] } : {}),
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
              ...(this._useVue ? { appendTsSuffixTo: [/\.vue$/] } : {}),
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
    return (existsSync(from)
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
                        return this.pathUtil.getPath(t).replace(/\\/g, '/')
                      }
                      return this.pathUtil.getPath(t.template).replace(/\\/g, '/')
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

  _createVueLoader () {
    return {
      test: /\.vue$/,
      use: [
        {
          loader: require.resolve('vue-loader')
        }
      ]
    }
  }

  _insertVueLoaderPlugin (webpackConfig) {
    const VueLoaderPlugin = wrapPlugin('VueLoaderPlugin', require('vue-loader').VueLoaderPlugin)
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

  _computePublicPath (config) {
    return typeof config.publicPath === 'string' ? config.publicPath : (this._electronTarget ? '/app/renderer/' : '/')
  }

  _createDevServerConfig (config, before) {
    return {
      stats: config.statsOptions,
      hot: true,
      host: config.devServerHost,
      inline: true,
      ...(this._webTarget ? { open: config.devServerOpenBrowser } : {}),
      contentBase: [this.pathUtil.getPath(config.contentBase)],
      publicPath: this._computePublicPath(config),
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
          ...(config.target === 'electron'
            ? {
                electron: '9.3.3'
              }
            : {})
        },
        dependencies: {}
      }
    }
    this.pkg = pkg
    this._useVue = config.vue !== undefined ? !!config.vue : !!((this.pkg.devDependencies && this.pkg.devDependencies.vue) || (this.pkg.dependencies && this.pkg.dependencies.vue))
    this._electronTarget = (config.target === 'electron')
    this._webTarget = (config.target === 'web')
    this._nodeTarget = (config.target === 'node')
    this._extractCss = config.extractcss !== undefined ? !!config.extractcss : (config.mode === 'production')

    this._useSass = config.sass !== undefined ? !!config.sass : !!(this.pkg.devDependencies && (this.pkg.devDependencies.sass || this.pkg.devDependencies['node-sass']))
    this._useStylus = config.stylus !== undefined ? !!config.stylus : !!(this.pkg.devDependencies && this.pkg.devDependencies.stylus)
    this._useLess = config.less !== undefined ? !!config.less : !!(this.pkg.devDependencies && this.pkg.devDependencies.less)

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
      this._useTypeScript = config.ts !== undefined
        ? !!config.ts
        : !!(
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

    this._useESLint = config.eslint !== undefined
      ? !!config.eslint
      : !!((this.pkg.devDependencies && this.pkg.devDependencies.eslint) || (
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
      publicPath: this._computePublicPath(config)
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
          ...(this._createNodeBaseRules(config.tsconfig.node, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals)],
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [this._createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : [])])] : []),
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
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._useTypeScript ? this._createTSXLoader(config, 'web') : []),
          ...(this._useVue ? [this._createVueLoader()] : []),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [this._createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
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
          ...(this._createNodeBaseRules(config.tsconfig.main, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals)],
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [this._createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : [])])] : []),
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
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._useTypeScript ? this._createTSXLoader(config, 'renderer') : []),
          ...(this._useVue ? [this._createVueLoader()] : []),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [this._createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
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
          ...(this._useBabel ? [this._createBabelLoader(/\.jsx?$/)] : []),
          ...(this._useTypeScript ? this._createTSXLoader(config, 'preload') : []),
          ...(this._useVue ? [this._createVueLoader()] : []),
          ...(this._createStyleLoaders(config)),
          ...(this._createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [this._createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
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

      this.rendererConfig.output = this.rendererConfig.output || {}
      this.rendererConfig.output.publicPath = this._computePublicPath(config)

      if (this._useTypeScript) {
        this.rendererConfig.plugins = [
          ...(this.rendererConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.renderer),
              extensions: {
                vue: this._useVue
              }
            }
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.main)
            }
          })
        ]
      }

      if (config.entry.preload) {
        this.preloadConfig.devtool = config.devtool.development

        this.preloadConfig.output = this.preloadConfig.output || {}
        this.preloadConfig.output.publicPath = this._computePublicPath(config)

        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            ...(this._createTypeScriptHelperProvidePlugin()),
            new ForkTsCheckerWebpackPlugin({
              typescript: {
                configFile: this.pathUtil.getPath(config.tsconfig.preload),
                extensions: {
                  vue: this._useVue
                }
              }
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
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.node)
            }
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

      this.webConfig.output = this.webConfig.output || {}
      this.webConfig.output.publicPath = this._computePublicPath(config)

      if (this._useTypeScript) {
        this.webConfig.plugins = [
          ...(this.webConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.web),
              extensions: {
                vue: this._useVue
              }
            }
          })
        ]
      }
    }
  }

  _mergeProduction (config) {
    const terser = () => {
      const option = {
        ...(config.productionSourcemap ? { sourceMap: true } : {}),
        ...(config.terserPlugin || {})
      }
      return new TerserWebpackPlugin(option)
    }

    const cssnano = () => {
      const option = {
        ...(config.productionSourcemap ? { sourceMap: true } : {}),
        ...(config.cssOptimize || {})
      }

      return new CssMinimizerWebpackPlugin(option)
    }

    if (this._electronTarget) {
      this.rendererConfig.optimization = {
        ...(this.rendererConfig.optimization || {}),
        minimizer: [
          terser(),
          cssnano()
        ]
      }

      if (typeof config.publicPath === 'string') {
        this.rendererConfig.output = this.rendererConfig.output || {}
        this.rendererConfig.output.publicPath = config.publicPath
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
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.renderer),
              extensions: {
                vue: this._useVue
              }
            }
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.main)
            }
          })
        ]
      }
      if (config.productionSourcemap) this.rendererConfig.devtool = this.mainConfig.devtool = config.devtool.production
      else this.rendererConfig.devtool = this.mainConfig.devtool = false

      if (config.entry.preload) {
        this.preloadConfig.optimization = {
          ...(this.preloadConfig.optimization || {}),
          minimizer: [
            terser(),
            cssnano()
          ]
        }
        if (typeof config.publicPath === 'string') {
          this.preloadConfig.output = this.preloadConfig.output || {}
          this.preloadConfig.output.publicPath = config.publicPath
        }
        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            ...(this._createTypeScriptHelperProvidePlugin()),
            new ForkTsCheckerWebpackPlugin({
              async: false,
              typescript: {
                memoryLimit: 4096,
                configFile: this.pathUtil.getPath(config.tsconfig.preload),
                extensions: {
                  vue: this._useVue
                }
              }
            })
          ]
        }
        if (config.productionSourcemap) this.preloadConfig.devtool = config.devtool.production
        else this.preloadConfig.devtool = false
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
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.node)
            }
          })
        ]
      }
      if (config.productionSourcemap) this.nodeConfig.devtool = config.devtool.production
      else this.nodeConfig.devtool = false
    } else {
      this.webConfig.optimization = {
        ...(this.webConfig.optimization || {}),
        minimizer: [
          terser(),
          cssnano()
        ]
      }

      if (typeof config.publicPath === 'string') {
        this.webConfig.output = this.webConfig.output || {}
        this.webConfig.output.publicPath = config.publicPath
      }

      if (this._useTypeScript) {
        this.webConfig.plugins = [
          ...(this.webConfig.plugins || []),
          ...(this._createTypeScriptHelperProvidePlugin()),
          new ForkTsCheckerWebpackPlugin({
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.web),
              extensions: {
                vue: this._useVue
              }
            }
          })
        ]
      }

      if (config.productionSourcemap) this.webConfig.devtool = config.devtool.production
      else this.webConfig.devtool = false
    }
  }
}

module.exports = WebpackConfig
