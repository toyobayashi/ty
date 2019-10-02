const merge = require('deepmerge')
const chalk = require('chalk')
const { existsSync } = require('fs-extra')
const { extname } = require('path')

const defaultConfig = {
  /**
   * @type {'production' | 'development'}
   */
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  /**
   * @type {string}
   */
  devServerHost: 'localhost',
  /**
   * @type {number}
   */
  devServerPort: 8090,
  /**
   * @type {'electron' | 'web'}
   */
  target: '',
  /**
   * @typedef {string | string[] | { [name: string]: string | string[] }} WebpackEntry
   * @type {{ web: WebpackEntry; renderer: WebpackEntry; main: WebpackEntry; preload: WebpackEntry | null }}
   */
  entry: {
    web: null,
    node: null,
    renderer: null,
    main: null,
    preload: null
  },
  /**
   * @type {{ web: string; renderer: string; main: string }}
   */
  output: {
    web: 'dist',
    node: 'dist',
    renderer: 'resources/app/renderer',
    main: 'resources/app/main',
    preload: 'resources/app/preload'
  },
  /**
   * @type {string}
   */
  contentBase: '',
  /**
   * @type {string}
   */
  resourcesPath: 'resources',
  /**
   * @type {string}
   */
  staticDir: 'public',
  /**
   * @type {string}
   */
  publicPath: '',
  /**
   * @type {string}
   */
  distPath: 'dist',
  /**
   * @type {string}
   */
  iconSrcDir: 'icon',
  /**
   * @type {any[]}
   */
  indexHtml: null,
  /**
   * @type {string}
   */
  assetsPath: '',

  /**
   * @type {'ia32' | 'x64'}
   */
  arch: process.arch,

  /**
   * @type {undefined | 0 | 1}
   */
  ts: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  generate: undefined,

  /**
   * @type {string}
   */
  context: '',
  /**
   * @type {boolean}
   */
  productionSourcemap: false,
  /**
   * @type {boolean}
   */
  cssModule: false,

  /**
   * @type {any}
   */
  cssLoaderOptions: {},

  /**
   * @type {{ [name: string]: string }}
   */
  alias: {},

  /**
   * @type {{ src: string; appid: { ia32: string; x64: string }; url: string }}
   */
  inno: {
    src: '',
    appid: {
      ia32: '',
      x64: ''
    },
    url: '',
    def: {}
  },
  /**
   * @type {{ web: string; renderer: string; main: string; preload: string }}
   */
  tsconfig: {
    web: 'tsconfig.json',
    node: 'tsconfig.json',
    renderer: 'tsconfig.renderer.json',
    main: 'tsconfig.main.json',
    preload: 'tsconfig.reload.json'
  },

  proxy: {},

  packHook: undefined,

  statsOptions: {
    colors: true,
    children: false,
    modules: false,
    entrypoints: false
  },

  terserPlugin: {
    parallel: true,
    cache: true,
    terserOptions: {
      ecma: 9,
      output: {
        beautify: false
      }
    }
  },

  htmlMinify: {
    removeComments: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    collapseBooleanAttributes: true,
    removeScriptTypeAttributes: true
  },

  cssOptimize: {
    cssProcessorPluginOptions: {
      preset: [
        'default',
        {
          mergeLonghand: false,
          cssDeclarationSorter: false
        }
      ]
    }
  },

  configureWebpack: {
    web (webConfig) {},
    node (nodeConfig) {},
    renderer (rendererConfig) {},
    main (mainConfig) {},
    preload (preloadConfig) {}
  }
}

function setDefault (config, key, value) {
  if (!config[key]) {
    config[key] = value
  }
}

function checkObject (o, msg) {
  if (Object.prototype.toString.call(o) !== '[object Object]') {
    console.log(chalk.redBright(msg))
    process.exit(1)
  }
}

function readTypeScriptConfigFile (fullPath) {
  let tsnode
  try {
    tsnode = require('ts-node')
  } catch (err) {
    console.log(chalk.redBright('Please install ts-node and typescript first if you want to use typescript config file.'))
    process.exit(1)
  }
  tsnode.register({ compilerOptions: { module: 'commonjs' } })
  return (require(fullPath).default || require(fullPath))
}

function readTyConfig (configPath, getPath) {
  let tyconfig = {}
  if (typeof configPath === 'string' && configPath !== '') {
    configPath = getPath(configPath)
    if (!existsSync(configPath)) {
      console.log(chalk.redBright(`Can not find config file: "${configPath}".`))
      process.exit(1)
    }
    const ext = extname(configPath)
    if (ext === '.js') {
      tyconfig = require(configPath)
    } else if (ext === '.ts') {
      tyconfig = readTypeScriptConfigFile(configPath)
    } else {
      console.log(chalk.redBright(`Can not resolve "${ext}" config file.`))
      process.exit(1)
    }
    checkObject(tyconfig, `${configPath} should export an object.`)
  } else {
    const tyconfigPath = getPath('./tyconfig.js')
    const tyconfigTsPath = getPath('./tyconfig.ts')

    if (existsSync(tyconfigPath)) {
      tyconfig = require(tyconfigPath)
    } else if (existsSync(tyconfigTsPath)) {
      tyconfig = readTypeScriptConfigFile(tyconfigTsPath)
    }
    checkObject(tyconfig, `tyconfig.${tyconfigTsPath ? 't' : 'j'}s should export an object.`)
  }

  // change context
  if (tyconfig.context) {
    const PathUtil = require('../util/path.js')
    const pu = new PathUtil(tyconfig.context)
    getPath = pu.getPath.bind(pu)
  }

  defaultConfig.alias = {
    '@': getPath('src')
  }
  const mergedConfig = merge(defaultConfig, tyconfig)

  require('../util/validate.js').shouldBeObject.forEach(key => {
    checkObject(mergedConfig[key], `module.exports.${key} should be an object.`)
  })

  if (!mergedConfig.target) {
    let pkg
    try {
      pkg = require(getPath('package.json'))
    } catch (_) {
      pkg = {}
    }
    if (pkg.devDependencies && pkg.devDependencies.electron) {
      mergedConfig.target = 'electron'
    } else {
      mergedConfig.target = 'web'
    }
  }

  if (mergedConfig.target === 'electron') {
    setDefault(mergedConfig, 'contentBase', mergedConfig.resourcesPath || 'resources')
    setDefault(mergedConfig, 'publicPath', '/app/renderer/')
  } else {
    setDefault(mergedConfig, 'contentBase', mergedConfig.output.web || 'dist')
    setDefault(mergedConfig, 'publicPath', '/')
  }

  if (!mergedConfig.entry) {
    mergedConfig.entry = {
      web: { app: [getPath('./src/index')] },
      node: { main: [getPath('./src/index')] },
      renderer: { renderer: [getPath('./src/renderer/renderer')] },
      main: { main: [getPath('./src/main/main')] },
      preload: null
    }
  }

  if (!mergedConfig.entry.web) {
    mergedConfig.entry.web = { app: [getPath('./src/index')] }
  }

  if (!mergedConfig.entry.node) {
    mergedConfig.entry.node = { main: [getPath('./src/index')] }
  }

  if (!mergedConfig.entry.renderer) {
    mergedConfig.entry.renderer = { renderer: [getPath('./src/renderer/renderer')] }
  }

  if (!mergedConfig.entry.main) {
    mergedConfig.entry.main = { main: [getPath('./src/main/main')] }
  }

  if (!mergedConfig.indexHtml) {
    mergedConfig.indexHtml = [{
      template: 'public/index.html'
    }]
  } else {
    if (!Array.isArray(mergedConfig.indexHtml)) {
      console.log(chalk.redBright('module.exports.indexHtml should be an array.'))
      process.exit(1)
    }
  }

  return mergedConfig
}

module.exports = readTyConfig
