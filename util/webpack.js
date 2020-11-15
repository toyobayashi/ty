let webpack
try {
  webpack = require('webpack')
} catch (_) {
  throw new Error('webpack is not found, try to run `npm install -D webpack` first')
}
const webpackVersion = Number(webpack.version.charAt(0))

function compile (config, statsOptions) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        console.log(err)
        return reject(err)
      }
      console.log(stats.toString(statsOptions) + '\n')
      resolve()
    })
  })
}

function watch (config, handler) {
  const compiler = webpack(config)
  compiler.watch({
    aggregateTimeout: 200,
    poll: undefined
  }, handler)
  return compiler
}

function startDevServer (configuration, port, host, callback) {
  let WebpackDevServer
  try {
    WebpackDevServer = require('webpack-dev-server')
  } catch (_) {
    throw new Error('webpack-dev-server is not found, try to run `npm install -D webpack-dev-server` first')
  }

  const devServerOptions = configuration.devServer || {}
  WebpackDevServer.addDevServerEntrypoints(configuration, devServerOptions)
  const server = new WebpackDevServer(webpack(configuration), devServerOptions)

  return server.listen(port, host, callback)
}

function copyExtraResources (config, webpackConfig, needWatch, watchCallback) {
  const fs = require('fs-extra')
  const chokidar = require('chokidar')
  const { relative, join } = require('path')
  const minimatch = require('minimatch')

  const filter = [
    '**/.gitkeep',
    '**/.DS_Store'
  ]

  const extraResourcesPath = webpackConfig.pathUtil.getPath(config.extraResourcesPath)
  const localResourcesPath = webpackConfig.pathUtil.getPath(config.localResourcesPath)
  if (fs.existsSync(extraResourcesPath)) {
    fs.copySync(
      extraResourcesPath,
      localResourcesPath,
      { filter: (src) => !filter.map(g => minimatch(src, g)).includes(true) }
    )
    if (needWatch) {
      const watcher = chokidar.watch(extraResourcesPath)
      watcher.on('all', (event, p) => {
        if (filter.map(g => minimatch(p, g)).includes(true)) {
          return
        }
        const rp = relative(extraResourcesPath, p)
        const tp = join(localResourcesPath, rp)
        if (event === 'unlink' || event === 'unlinkDir') {
          fs.removeSync(tp)
        } else {
          fs.copySync(p, tp, { filter: (src) => !src.endsWith('.gitkeep') })
        }
        if (typeof watchCallback === 'function') {
          watchCallback(event, p)
        }
      })
    }
  }
}

module.exports = {
  webpack,
  webpackVersion,
  compile,
  watch,
  startDevServer,
  copyExtraResources
}
