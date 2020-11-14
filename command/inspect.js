const WebpackConfig = require('../config/webpack.config.js')
const { stringify } = require('javascript-stringify')
const { highlight } = require('cli-highlight')
const { EOL } = require('os')
const { isAbsolute, relative } = require('path')

module.exports = function (config) {
  const pluginNames = new Set()
  const builtins = new Set()
  const webpackPlugins = new Set()
  const htmls = new Set()
  const wc = new WebpackConfig(config, false)
  const context = wc.pathUtil.getPath()
  console.log(`// @tybys/ty version ${require('../package.json').version}`)
  console.log(`// https://github.com/toyobayashi/ty${EOL}`)
  Object.keys(wc).forEach(k => {
    if (k[0] === '_') {
      console.log(`// ${k}: ${wc[k]}`)
    }
  })

  const ignorePathKey = ['publicPath']

  const toRelative = (value) => {
    builtins.add('path')
    const joinpath = relative(context, value)
    if (!joinpath) return 'context'
    return `path.join(context, '${joinpath.replace(/\\/g, '/')}')`
  }

  const stringifyWebpackConfig = function (value, space, next, key) {
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
        pluginNames.add(value.__ty_webpack_plugin_name__)
      }
      if (value.__ty_webpack_plugin_name__ === 'HtmlWebpackPlugin') {
        htmls.add(value.__ty_webpack_plugin_options__.template)
      }
      return `new ${value.__ty_webpack_plugin_name__}(${value.__ty_webpack_plugin_options__
        ? stringify(value.__ty_webpack_plugin_options__, (value, space, next, key) => {
            if (typeof value === 'string' && isAbsolute(value)) {
              return toRelative(value)
            }
            if (key === 'ignore' && Array.isArray(value)) {
              return next(value.map(g => {
                if (isAbsolute(g)) {
                  return `##{${toRelative(g) + ".replace(/\\/g, '/')"}}`
                }
                return g
              }))
            }
            return next(value)
          }, 2).replace(/'##\{(.*?)\}'/g, function (a, b) {
            return b.replace(/\\'/g, '\'')
          })
        : ''})`
    } else if (value && (key === 'loader')) {
      const patharr = value.split(/[\\/]/)
      const pkgname = patharr[patharr.indexOf('node_modules') + 1]
      if (pkgname === 'mini-css-extract-plugin') {
        return 'MiniCssExtractPlugin.loader'
      }
      return `require.resolve('${pkgname}')`
    } else if (typeof value === 'string' && !ignorePathKey.includes(key) && isAbsolute(value)) {
      return toRelative(value)
    }
    return next(value)
  }

  const genPreCode = () => {
    let pre = ''
    if (builtins.size > 0) {
      for (const name of builtins) {
        pre += `const ${name} = require('${name}')${EOL}`
      }
    }
    if (webpackPlugins.size > 0) {
      pre += `const webpack = require('webpack')${EOL}`
    }
    if (pluginNames.size > 0) {
      for (const pluginName of pluginNames) {
        if (pluginName === 'VueLoaderPlugin') {
          pre += `const ${pluginName} = require('vue-loader').${pluginName}${EOL}`
        } else {
          pre += `const ${pluginName} = require('${decamelize(pluginName)}')${EOL}`
        }
      }
    }
    pre += `const context = '${context.replace(/\\/g, '\\\\')}'${EOL}`
    if (config.mode === 'development' && htmls.size > 0) {
      pre += `const htmls = [${Array.from(htmls).map(p => `${toRelative(p)}`).join(', ')}]${EOL}`
    }
    return pre
  }

  let code = ''
  let confCode = ''
  if (wc._webTarget) {
    confCode = `const webConfig = ${stringify(wc.webConfig, stringifyWebpackConfig, 2)}${EOL}`
    code = `${genPreCode()}${confCode}`
    code += 'module.exports = webConfig'
  } else if (wc._nodeTarget) {
    confCode = `const nodeConfig = ${stringify(wc.nodeConfig, stringifyWebpackConfig, 2)}${EOL}`
    code = `${genPreCode()}${confCode}`
    code += 'module.exports = nodeConfig'
  } else if (wc._electronTarget) {
    confCode = `const mainConfig = ${stringify(wc.mainConfig, stringifyWebpackConfig, 2)}${EOL}`
    confCode += `const rendererConfig = ${stringify(wc.rendererConfig, stringifyWebpackConfig, 2)}${EOL}`
    if (config.entry.preload) confCode += `const preloadConfig = ${stringify(wc.preloadConfig, stringifyWebpackConfig, 2)}${EOL}`
    code = `${genPreCode()}${confCode}`
    code += `module.exports = [mainConfig, rendererConfig${config.entry.preload ? ' ,preloadConfig' : ''}]`
  } else {
    throw new Error('Unknown target')
  }

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
