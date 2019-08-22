const webpack = require('webpack')

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

module.exports = {
  compile,
  watch
}
