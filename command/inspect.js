const WebpackConfig = require('../config/webpack.config.js')
const { stringify } = require('javascript-stringify')
const { highlight } = require('cli-highlight')

module.exports = function (config) {
  const modules = new Set()
  const webpackPlugins = new Set()
  const htmls = new Set()
  const wc = new WebpackConfig(config, false)

  Object.keys(wc).forEach(k => {
    if (k[0] === '_') {
      console.log(`// ${k}: ${wc[k]}`)
    }
  })

  let conf
  if (wc._webTarget) {
    conf = wc.webConfig
  } else if (wc._nodeTarget) {
    conf = wc.nodeConfig
  } else {
    conf = wc
  }

  let code = stringify(conf, function (value, space, next, key) {
    if (typeof value === 'function') {
      let str = value.toString()
      if (str.indexOf('this._watchHtml(config, server)') !== -1) {
        str = str.replace('this._watchHtml(config, server)', 'htmls.forEach(item => server._watch(item))')
        str = str.replace('this.pathUtil.getPath(config.contentBase))', wc.pathUtil.getPath(config.contentBase))
        str = str.replace(/(\r?\n) {6}/g, '$1')
        return str
      }
      if (str.length > 1000) {
        return '[Function]'
      } else {
        return next(value)
      }
    } else if (value.__ty_webpack_plugin_name__) {
      if (value.__ty_webpack_plugin_name__.indexOf('webpack.') === 0) {
        webpackPlugins.add(value.__ty_webpack_plugin_name__.split('.')[1])
      } else {
        modules.add(value.__ty_webpack_plugin_name__)
      }
      if (value.__ty_webpack_plugin_name__ === 'HtmlWebpackPlugin') {
        htmls.add(value.__ty_webpack_plugin_options__.template)
      }
      return `new ${value.__ty_webpack_plugin_name__}(${value.__ty_webpack_plugin_options__ ? stringify(value.__ty_webpack_plugin_options__, null, 2) : ''})`
    } else if (value && (key === 'loader')) {
      const patharr = value.split(/[\\/]/)
      const pkgname = patharr[patharr.indexOf('node_modules') + 1]
      return `require.resolve('${pkgname}')`
    }
    return next(value)
  }, 2)
  let pre = ''
  if (webpackPlugins.size > 0) {
    pre += 'const webpack = require(\'webpack\')\n'
  }
  if (modules.size > 0) {
    for (const pluginName of modules) {
      pre += `const ${pluginName} = require('${decamelize(pluginName)}')\n`
    }
  }
  if (htmls.size > 0) {
    pre += `const htmls = [${Array.from(htmls).map(p => `'${p.replace(/(\\)/g, '\\$1')}'`).join(', ')}]\n`
  }

  pre += 'module.exports = '

  code = pre + code
  console.log(highlight(code, { language: 'js' }))
}

function decamelize (text, separator = '-') {
  if (!(typeof text === 'string' && typeof separator === 'string')) {
    throw new TypeError('The `text` and `separator` arguments should be of type `string`')
  }

  return text
    .replace(/([\p{Lowercase_Letter}\d])(\p{Uppercase_Letter})/gu, `$1${separator}$2`)
    .replace(/(\p{Uppercase_Letter}+)(\p{Uppercase_Letter}\p{Lowercase_Letter}+)/gu, `$1${separator}$2`)
    .toLowerCase()
}
