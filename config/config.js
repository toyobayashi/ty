const merge = require('deepmerge')
const chalk = require('chalk')
const { existsSync } = require('fs-extra')
const getPath = require('../util/path.js')

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
    renderer: null,
    main: null
  },
  /**
   * @type {{ web: string; renderer: string; main: string }}
   */
  output: {
    web: 'dist',
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

function readTyConfig () {
  const tyconfigPath = getPath('./tyconfig.js')
  const tyconfigTsPath = getPath('./tyconfig.ts')

  let tyconfig = {}

  if (existsSync(tyconfigPath)) {
    tyconfig = require(tyconfigPath)
  } else if (existsSync(tyconfigTsPath)) {
    let tsnode
    try {
      tsnode = require('ts-node')
    } catch (err) {
      console.log(chalk.redBright('Please install ts-node first if you want to use typescript config file.'))
      process.exit(1)
    }
    tsnode.register({})
    tyconfig = require(tyconfigTsPath).default
  }

  checkObject(tyconfig, `tyconfig.js should export an object.`)
  const mergedConfig = merge(defaultConfig, tyconfig);

  (['output', 'tsconfig', 'inno']).forEach(key => {
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
  } else if (mergedConfig.target === 'web') {
    setDefault(mergedConfig, 'contentBase', mergedConfig.output.web || 'dist')
    setDefault(mergedConfig, 'publicPath', '/')
  }

  if (!mergedConfig.entry) {
    mergedConfig.entry = {
      web: { app: [getPath('./src/index')] },
      renderer: { renderer: [getPath('./src/renderer/renderer')] },
      main: { main: [getPath('./src/main/main')] }
    }
  }

  if (!mergedConfig.entry.web) {
    mergedConfig.entry.web = { app: [getPath('./src/index')] }
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
