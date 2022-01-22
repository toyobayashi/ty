let webpack
try {
  webpack = require('webpack')
} catch (_) {
  throw new Error('webpack is not found, try to run `npm install -D webpack` first')
}

const camelcase = require('camelcase')
const uppercamelcase = require('uppercamelcase')

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

function startDevServer (configuration, callback) {
  let WebpackDevServer
  try {
    WebpackDevServer = require('webpack-dev-server')
  } catch (_) {
    throw new Error('webpack-dev-server is not found, try to run `npm install -D webpack-dev-server` first')
  }

  const compiler = webpack(configuration)

  const devServerOptions = configuration.devServer || {}
  const server = new WebpackDevServer(devServerOptions, compiler)

  return typeof callback === 'function'
    ? new Promise((resolve, reject) => {
      server.startCallback((err) => {
        if (err) return reject(err)
        try {
          callback()
        } catch (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
    : server.start()
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

function getLoaderPath (config, name) {
  const camel = camelcase(name)
  if (typeof config.loaderPath[camel] === 'string') {
    return config.loaderPath[camel]
  }
  return require.resolve(name)
}

function getPluginImplementation (config, name) {
  const uppercame = uppercamelcase(name)
  if (typeof config.pluginImplementation[uppercame] === 'function') {
    return config.pluginImplementation[uppercame]
  }
  return require(name)
}

module.exports = {
  webpack,
  compile,
  watch,
  startDevServer,
  copyExtraResources,
  getLoaderPath,
  getPluginImplementation
}
