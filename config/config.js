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
   * @type {{ web: WebpackEntry; renderer: WebpackEntry; main: WebpackEntry }}
   */
  entry: {
    web: null,
    node: null,
    renderer: null,
    main: null
  },
  /**
   * @type {{ web: string; renderer: string; main: string }}
   */
  output: {
    web: 'dist',
    node: 'dist',
    renderer: 'resources/app/renderer',
    main: 'resources/app/main'
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
   * @type {string}
   */
  indexHtml: 'public/index.html',
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
   * @type {string}
   */
  context: '',
  /**
   * @type {boolean}
   */
  productionSourcemap: false,

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
    url: ''
  },
  /**
   * @type {{ web: string; renderer: string; main: string }}
   */
  tsconfig: {
    web: 'tsconfig.json',
    node: 'tsconfig.json',
    renderer: 'src/renderer/tsconfig.json',
    main: 'src/main/tsconfig.json'
  },

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

  configureWebpack: {
    web (webConfig) {},
    node (nodeConfig) {},
    renderer (rendererConfig) {},
    main (mainConfig) {}
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
  tsnode.register({})
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
      main: { main: [getPath('./src/main/main')] }
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

  return mergedConfig
}

module.exports = readTyConfig
