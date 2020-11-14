const merge = require('deepmerge')
const chalk = require('chalk')
const { existsSync } = require('fs-extra')
const { extname, posix } = require('path')

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
   * @type {boolean | string}
   */
  devServerOpenBrowser: false,
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
    renderer: '',
    main: '',
    preload: ''
  },

  out: {
    js: '[name].js',
    css: '[name].css',
    node: '[name].[ext]',
    assets: '[name].[ext]'
  },

  /**
   * @type {string}
   */
  contentBase: '',
  /**
   * @type {string}
   */
  localResourcesPath: '',
  /**
   * @type {string}
   */
  extraResourcesPath: 'resources',
  /**
   * @type {string}
   */
  staticDir: 'public',
  /**
   * @type {string | undefined}
   */
  publicPath: undefined,
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
  eslint: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  sass: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  less: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  stylus: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  vue: undefined,

  /**
   * @type {undefined | 0 | 1}
   */
  generate: undefined,

  /**
   * @type {string}
   */
  context: '',

  /**
   * @type {{ development: string; production: string }}
   */
  devtool: {
    development: 'eval-source-map',
    production: 'source-map'
  },
  /**
   * @type {boolean}
   */
  productionSourcemap: false,

  /**
   * @type {any}
   */
  cssLoaderOptions: {},
  postcssLoaderOptions: {},
  stylusLoaderOptions: {},
  lessLoaderOptions: {},
  sassLoaderOptions: {},

  eslintPluginOptions: {},

  /**
   * @type {{ [name: string]: string }}
   */
  alias: {},
  /**
   * @type {boolean}
   */
  progress: false,
  /**
   * @type {undefined | 0 | 1}
   */
  extractcss: undefined,

  /**
   * @type {{ [key: string]: string }}
   */
  define: {},

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
    renderer: 'src/renderer/tsconfig.json',
    main: 'src/main/tsconfig.json',
    preload: 'src/preload/tsconfig.json'
  },

  proxy: {},

  packHook: undefined,

  packTempAppDir: '',

  packagerOptions: {},

  asarOptions: {
    unpack: '*.node'
  },

  nodeModulesAsar: false,

  nodeExternals: {
    allowlist: ['tslib']
  },

  prune: { production: true },

  statsOptions: {
    colors: true,
    children: false,
    modules: false,
    entrypoints: false
  },

  terserPlugin: {
    parallel: true,
    // cache: true,
    extractComments: false,
    terserOptions: {
      ecma: 2018,
      output: {
        comments: false,
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
    minimizerOptions: {
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

  setDefault(mergedConfig, 'localResourcesPath', 'local_resources')
  setDefault(mergedConfig, 'packTempAppDir', posix.join(mergedConfig.distPath, '_app'))
  if (mergedConfig.target === 'electron') {
    if (mergedConfig.localResourcesPath === mergedConfig.extraResourcesPath) {
      console.log(chalk.redBright('Error: localResourcesPath === extraResourcesPath'))
      process.exit(1)
    }
    setDefault(mergedConfig, 'contentBase', mergedConfig.localResourcesPath)
    // setDefault(mergedConfig, 'publicPath', '/app/renderer/')
    if (!mergedConfig.output.main) {
      mergedConfig.output.main = posix.join(mergedConfig.localResourcesPath, 'app/main')
    }
    if (!mergedConfig.output.renderer) {
      mergedConfig.output.renderer = posix.join(mergedConfig.localResourcesPath, 'app/renderer')
    }
    if (!mergedConfig.output.preload) {
      mergedConfig.output.preload = posix.join(mergedConfig.localResourcesPath, 'app/preload')
    }
  } else {
    setDefault(mergedConfig, 'contentBase', mergedConfig.output.web || 'dist')
    // setDefault(mergedConfig, 'publicPath', '/')
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
    mergedConfig.indexHtml = ['public/index.html']
  } else {
    if (!Array.isArray(mergedConfig.indexHtml)) {
      console.log(chalk.redBright('module.exports.indexHtml should be an array.'))
      process.exit(1)
    }
  }

  return mergedConfig
}

module.exports = readTyConfig
