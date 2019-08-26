const merge = require('deepmerge')
const getPath = require('../util/path.js')

const tyconfigPath = getPath('./tyconfig.json')

let tyconfig = {}
try {
  tyconfig = require(tyconfigPath)
} catch (_) {}

const config = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devServerHost: 'localhost',
  devServerPort: 8090,
  target: 'electron',
  entry: {
    web: null,
    renderer: null,
    main: null
  },
  output: {
    web: 'dist',
    renderer: 'resources/app/renderer',
    main: 'resources/app/main'
  },
  contentBase: 'resources/app/renderer',
  resourcesPath: 'resources',
  publicPath: '/',
  distPath: 'dist',
  iconSrcDir: 'icon',
  indexHtml: 'public/index.html',
  serveAsar: false,

  arch: process.arch,
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
  }
}

module.exports = merge(config, tyconfig)
