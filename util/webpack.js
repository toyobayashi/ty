const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

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
  const devServerOptions = configuration.devServer || {}
  WebpackDevServer.addDevServerEntrypoints(configuration, devServerOptions)
  const server = new WebpackDevServer(webpack(configuration), devServerOptions)

  return server.listen(port, host, callback)
}

module.exports = {
  compile,
  watch,
  startDevServer
}
