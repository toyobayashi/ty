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
    web: 'src/index',
    renderer: 'src/renderer/renderer',
    main: 'src/main/main'
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

  arch: process.arch,
  inno: {
    appid: '', // 527DE8CC-F8A6-4ADF-8977-38BEC5BD8F41
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
