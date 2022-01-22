const path = require('path')
const wrapPlugin = require('../util/plugin.js')
const { getPluginImplementation } = require('../util/webpack.js')

function createHtmlPlugins (wc, config) {
  if (!config.indexHtml || config.indexHtml.length === 0) return []
  const HtmlWebpackPlugin = wrapPlugin('HtmlWebpackPlugin', getPluginImplementation(config, 'html-webpack-plugin'))
  return config.indexHtml.map(htmlOption => {
    if (typeof htmlOption === 'string') {
      const template = wc.pathUtil.getPath(htmlOption)
      return new HtmlWebpackPlugin({
        title: wc.pkg.name,
        template: template,
        filename: path.basename(template),
        minify: config.mode === 'production' ? config.htmlMinify : false,
        cache: false
      })
    }

    const template = wc.pathUtil.getPath(htmlOption.template)
    return new HtmlWebpackPlugin({
      cache: false,
      ...htmlOption,
      title: htmlOption.title || wc.pkg.name,
      template: template,
      filename: htmlOption.filename || path.basename(template),
      minify: config.mode === 'production' ? (htmlOption.minify || config.htmlMinify) : false
    })
  })
}

function watchHtml (wc, config, server) {
  const files = []
  for (let i = 0; i < config.indexHtml.length; i++) {
    const item = config.indexHtml[i]
    const tpl = typeof item === 'string' ? item : item.template
    files.push(wc.pathUtil.getPath(tpl))
  }
  server.watchFiles(files)
}

exports.createHtmlPlugins = createHtmlPlugins
exports.watchHtml = watchHtml
