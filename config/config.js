const merge = require('deepmerge')
const getPath = require('../util/path.js')

const tyconfigPath = getPath('./tyconfig.js')

let tyconfig = {}
try {
  tyconfig = require(tyconfigPath)
} catch (_) {}

const config = {
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
  target: 'electron',
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

const mergedConfig = merge(config, tyconfig)

if (mergedConfig.target === 'electron') {
  setDefault(mergedConfig, 'contentBase', mergedConfig.resourcesPath || 'resources')
  setDefault(mergedConfig, 'publicPath', '/app/renderer/')
} else if (mergedConfig.target === 'web') {
  setDefault(mergedConfig, 'contentBase', mergedConfig.output.web || 'dist')
  setDefault(mergedConfig, 'publicPath', '/')
}

module.exports = mergedConfig

function setDefault (config, key, value) {
  if (!config[key]) {
    config[key] = value
  }
}
