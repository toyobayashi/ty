const { execSync } = require('child_process')
const { existsSync, mkdirsSync, readJSONSync } = require('fs-extra')
const webpackNodeExternals = require('webpack-node-externals')
const wrapPlugin = require('../util/plugin.js')

const { webpack, getPluginImplementation, isWebpack5plus } = require('../util/webpack.js')

const HotModuleReplacementPlugin = wrapPlugin('webpack.HotModuleReplacementPlugin', webpack.HotModuleReplacementPlugin)
const ProgressPlugin = wrapPlugin('webpack.ProgressPlugin', webpack.ProgressPlugin)

const PathUtil = require('../util/path.js')
const path = require('path')
const { ensureEntry, copyTemplate } = require('../util/file.js')
const merge = require('deepmerge')
const semver = require('semver')

const {
  createDefinePlugin,
  createCopyPlugin,
  defaultResolveFallback,
  defaultEs5OutputEnvironment,
  computePublicPath,
  createDevServerConfig,
  getCjsLibraryTarget
} = require('./common.js')
const { createStyleLoaders, cssExtract } = require('./css.js')
const { createAssetsLoaders } = require('./asset.js')
const { createEslintPlugin, createBabelLoader } = require('./javascript.js')
const { createTypeScriptHelperProvidePlugin, createTSXLoader } = require('./typescript.js')
const { createNodeLoader, createNodeBaseRules, defaultNodeLib } = require('./node.js')
const { createHtmlPlugins, watchHtml } = require('./html.js')
const { createVueLoader, insertVueLoaderPlugin } = require('./vue.js')

class WebpackConfig {
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
                electron: '12.0.7'
              }
            : {})
        },
        dependencies: {}
      }
    }
    this.pkg = pkg
    this._webpack5 = isWebpack5plus(config)
    this._useVue = config.vue !== undefined ? !!config.vue : !!((this.pkg.devDependencies && this.pkg.devDependencies.vue) || (this.pkg.dependencies && this.pkg.dependencies.vue))
    this._useVue3 = this._useVue && !!((this.pkg.devDependencies && this.pkg.devDependencies.vue && semver.gte(semver.coerce(this.pkg.devDependencies.vue), '3.0.0')) || (this.pkg.dependencies && this.pkg.dependencies.vue && semver.gte(semver.coerce(this.pkg.dependencies.vue), '3.0.0')))
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

    this._useBabel = !!((this.pkg.devDependencies && this.pkg.devDependencies['@babel/core']) || (
      existsSync(this.pathUtil.getPath('babel.config.js')) ||
      existsSync(this.pathUtil.getPath('.babelrc'))
    ))

    this._useVueJsx = !!(this._useBabel && this.pkg.devDependencies && (
      this.pkg.devDependencies['@vue/babel-preset-jsx'] ||
      this.pkg.devDependencies['@vue/babel-plugin-jsx']
    ))

    this._useBabelToTransformTypescript = !!(this._useBabel && this.pkg.devDependencies && (
      this.pkg.devDependencies['@babel/preset-typescript'] ||
      this.pkg.devDependencies['@babel/plugin-transform-typescript'] ||
      this.pkg.devDependencies['@babel/plugin-syntax-typescript']
    ))

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
            tsconfigFileExists.preloadTSConfig ||
            this._useBabelToTransformTypescript
          )
    } else if (this._nodeTarget) {
      tsconfigFileExists.nodeTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.node))
      this._useTypeScript = config.ts !== undefined ? !!config.ts : !!(existsTypeScriptInPackageJson || tsconfigFileExists.nodeTSConfig || this._useBabelToTransformTypescript)
    } else {
      tsconfigFileExists.webTSConfig = existsSync(this.pathUtil.getPath(config.tsconfig.web))
      this._useTypeScript = config.ts !== undefined ? !!config.ts : !!(existsTypeScriptInPackageJson || tsconfigFileExists.webTSConfig || this._useBabelToTransformTypescript)
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
      publicPath: computePublicPath(this, config)
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
        ...getCjsLibraryTarget(this)
      },
      node: false,
      module: {
        rules: [
          ...(createNodeBaseRules(this, config.tsconfig.node, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals.node)],
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : [])])] : []),
        createDefinePlugin(this, config),
        ...(config.progress ? [new ProgressPlugin()] : [])
      ]
    }
  }

  _initWeb (config) {
    const webpack5plus = this._webpack5
    this.webConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'web',
      entry: config.entry.web,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.web),
        ...(webpack5plus ? { environment: defaultEs5OutputEnvironment() } : {})
      },
      node: webpack5plus ? false : defaultNodeLib(),
      module: {
        rules: [
          ...(this._useBabel ? [createBabelLoader(config, /\.jsx?$/)] : []),
          ...(this._useTypeScript ? createTSXLoader(this, config, 'web') : []),
          ...(this._useVue ? [createVueLoader(config)] : []),
          ...(createStyleLoaders(this, config)),
          ...(createAssetsLoaders(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm'],
        ...(webpack5plus ? { fallback: defaultResolveFallback() } : {})
      },
      plugins: [
        ...(this._useESLint ? [createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
        ...(createHtmlPlugins(this, config)),
        ...(createCopyPlugin(this, config, 'web')),
        createDefinePlugin(this, config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(cssExtract(this, config))
      ]
    }

    if (this._useVue) {
      insertVueLoaderPlugin(config, this.webConfig)
    }
  }

  _initMain (config) {
    const CopyWebpackPlugin = wrapPlugin('CopyWebpackPlugin', getPluginImplementation(config, 'copy-webpack-plugin'))
    this.mainConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: 'electron-main',
      entry: config.entry.main,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.main),
        ...getCjsLibraryTarget(this)
      },
      node: false,
      module: {
        rules: [
          ...(createNodeBaseRules(this, config.tsconfig.main, config))
        ]
      },
      externals: [webpackNodeExternals(config.nodeExternals.main)],
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', '.json', '.node', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : [])])] : []),
        new CopyWebpackPlugin({
          patterns: [
            { from: this.pathUtil.getPath('package.json'), to: this.pathUtil.getPath(config.localResourcesPath, 'app/package.json') }
          ]
        }),
        createDefinePlugin(this, config),
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
    const webpack5plus = this._webpack5
    this.rendererConfig = {
      mode: config.mode,
      context: this.pathUtil.getPath(),
      target: config.entry.preload ? 'web' : 'electron-renderer',
      entry: config.entry.renderer,
      output: {
        filename: config.out.js,
        path: this.pathUtil.getPath(config.output.renderer),
        ...((config.entry.preload && webpack5plus) ? { environment: defaultEs5OutputEnvironment() } : {})
      },
      node: config.entry.preload ? (webpack5plus ? false : defaultNodeLib()) : false,
      module: {
        rules: [
          ...(this._useBabel ? [createBabelLoader(config, /\.jsx?$/)] : []),
          ...(this._useTypeScript ? createTSXLoader(this, config, 'renderer') : []),
          ...(this._useVue ? [createVueLoader(config)] : []),
          ...(createStyleLoaders(this, config)),
          ...(createAssetsLoaders(config)),
          ...(config.entry.preload ? [] : [createNodeLoader(config)])
        ]
      },
      ...(config.entry.preload ? {} : { externals: [webpackNodeExternals(config.nodeExternals.renderer)] }),
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), ...(config.entry.preload ? [] : ['.node']), ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm'],
        ...((config.entry.preload && webpack5plus) ? { fallback: defaultResolveFallback() } : {})
      },
      plugins: [
        ...(this._useESLint ? [createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
        ...(createHtmlPlugins(this, config)),
        ...(createCopyPlugin(this, config, 'renderer')),
        createDefinePlugin(this, config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(cssExtract(this, config))
      ]
    }

    if (this._useVue) {
      insertVueLoaderPlugin(config, this.rendererConfig)
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
        ...getCjsLibraryTarget(this)
      },
      node: false,
      externals: [webpackNodeExternals(config.nodeExternals.preload)],
      module: {
        rules: [
          ...(this._useBabel ? [createBabelLoader(config, /\.jsx?$/)] : []),
          ...(this._useTypeScript ? createTSXLoader(this, config, 'preload') : []),
          ...(this._useVue ? [createVueLoader(config)] : []),
          ...(createStyleLoaders(this, config)),
          ...(createAssetsLoaders(config)),
          ...(createNodeLoader(config))
        ]
      },
      resolve: {
        alias: config.alias,
        extensions: [...(this._useTypeScript ? ['.tsx', '.ts'] : []), '.mjs', '.cjs', '.js', ...(this._useBabel ? ['.jsx'] : []), '.node', ...(this._useVue ? ['.vue'] : []), ...(this._useStylus ? ['.styl', '.stylus'] : []), ...(this._useLess ? ['.less'] : []), ...(this._useSass ? ['.scss', '.sass'] : []), '.css', '.json', '.wasm']
      },
      plugins: [
        ...(this._useESLint ? [createEslintPlugin(config, ['js', 'jsx', 'mjs', ...(this._useTypeScript ? ['tsx', 'ts'] : []), ...(this._useVue ? ['vue'] : [])])] : []),
        createDefinePlugin(this, config),
        ...(config.progress ? [new ProgressPlugin()] : []),
        ...(cssExtract(this, config))
      ]
    }

    if (this._useVue) {
      insertVueLoaderPlugin(config, this.preloadConfig)
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
    const ForkTsCheckerWebpackPlugin = wrapPlugin('ForkTsCheckerWebpackPlugin', getPluginImplementation(config, 'fork-ts-checker-webpack-plugin'))
    if (this._electronTarget) {
      this.rendererConfig.devServer = createDevServerConfig(this, config, (app, server) => {
        app.use(require('express-serve-asar')(this.pathUtil.getPath(config.contentBase)))
        watchHtml(this, config, server)
      })

      this.rendererConfig.devtool = this.mainConfig.devtool = config.devtool.development
      this.rendererConfig.plugins = [
        ...(this.rendererConfig.plugins || []),
        new HotModuleReplacementPlugin()
      ]

      this.rendererConfig.output = this.rendererConfig.output || {}
      this.rendererConfig.output.publicPath = computePublicPath(this, config)

      if (this._useTypeScript) {
        this.rendererConfig.plugins = [
          ...(this.rendererConfig.plugins || []),
          ...(createTypeScriptHelperProvidePlugin(this)),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.renderer),
              extensions: {
                vue: this._useVue && !this._useVue3
              }
            }
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          ...(createTypeScriptHelperProvidePlugin(this)),
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
        this.preloadConfig.output.publicPath = computePublicPath(this, config)

        if (this._useTypeScript) {
          this.preloadConfig.plugins = [
            ...(this.preloadConfig.plugins || []),
            ...(createTypeScriptHelperProvidePlugin(this)),
            new ForkTsCheckerWebpackPlugin({
              typescript: {
                configFile: this.pathUtil.getPath(config.tsconfig.preload),
                extensions: {
                  vue: this._useVue && !this._useVue3
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
          ...(createTypeScriptHelperProvidePlugin(this)),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.node)
            }
          })
        ]
      }
    } else {
      this.webConfig.devServer = createDevServerConfig(this, config, (_app, server) => {
        watchHtml(this, config, server)
      })

      this.webConfig.devtool = config.devtool.development
      this.webConfig.plugins = [
        ...(this.webConfig.plugins || []),
        new HotModuleReplacementPlugin()
      ]

      this.webConfig.output = this.webConfig.output || {}
      this.webConfig.output.publicPath = computePublicPath(this, config)

      if (this._useTypeScript) {
        this.webConfig.plugins = [
          ...(this.webConfig.plugins || []),
          ...(createTypeScriptHelperProvidePlugin(this)),
          new ForkTsCheckerWebpackPlugin({
            typescript: {
              configFile: this.pathUtil.getPath(config.tsconfig.web),
              extensions: {
                vue: this._useVue && !this._useVue3
              }
            }
          })
        ]
      }
    }
  }

  _mergeProduction (config) {
    const ForkTsCheckerWebpackPlugin = wrapPlugin('ForkTsCheckerWebpackPlugin', getPluginImplementation(config, 'fork-ts-checker-webpack-plugin'))
    const terser = () => {
      let TerserWebpackPlugin
      if (typeof config.pluginImplementation.TerserWebpackPlugin === 'function') {
        TerserWebpackPlugin = wrapPlugin('TerserWebpackPlugin', config.pluginImplementation.TerserWebpackPlugin)
        return new TerserWebpackPlugin(config.terserPlugin || {})
      }

      TerserWebpackPlugin = wrapPlugin('TerserWebpackPlugin', require('terser-webpack-plugin'))
      const { findPrefixSync } = require('@tybys/find-npm-prefix')
      const terserPlugin5 = semver.gte(readJSONSync(path.join(findPrefixSync(path.dirname(require.resolve('terser-webpack-plugin'))), 'package.json')).version, '5.0.0')
      const option = {
        ...((config.productionSourcemap && !terserPlugin5) ? { sourceMap: true } : {}),
        ...(config.terserPlugin || {})
      }
      return new TerserWebpackPlugin(option)
    }

    const cssnano = () => {
      const option = {
        ...(config.productionSourcemap ? { sourceMap: true } : {}),
        ...(config.cssOptimize || {})
      }

      const CssMinimizerWebpackPlugin = wrapPlugin('CssMinimizerWebpackPlugin', getPluginImplementation(config, 'css-minimizer-webpack-plugin'))
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
          ...(createTypeScriptHelperProvidePlugin(this)),
          new ForkTsCheckerWebpackPlugin({
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.renderer),
              extensions: {
                vue: this._useVue && !this._useVue3
              }
            }
          })
        ]

        this.mainConfig.plugins = [
          ...(this.mainConfig.plugins || []),
          ...(createTypeScriptHelperProvidePlugin(this)),
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
            ...(createTypeScriptHelperProvidePlugin(this)),
            new ForkTsCheckerWebpackPlugin({
              async: false,
              typescript: {
                memoryLimit: 4096,
                configFile: this.pathUtil.getPath(config.tsconfig.preload),
                extensions: {
                  vue: this._useVue && !this._useVue3
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
          ...(createTypeScriptHelperProvidePlugin(this)),
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
          ...(createTypeScriptHelperProvidePlugin(this)),
          new ForkTsCheckerWebpackPlugin({
            async: false,
            typescript: {
              memoryLimit: 4096,
              configFile: this.pathUtil.getPath(config.tsconfig.web),
              extensions: {
                vue: this._useVue && !this._useVue3
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
