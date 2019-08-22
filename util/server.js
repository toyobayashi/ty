const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

function startDevServer (configuration, port, host, callback) {
  const devServerOptions = configuration.devServer || {}
  WebpackDevServer.addDevServerEntrypoints(configuration, devServerOptions)
  const server = new WebpackDevServer(webpack(configuration), devServerOptions)

  return server.listen(port, host, callback)
}

module.exports = startDevServer
