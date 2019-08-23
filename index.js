const { readdirSync } = require('fs-extra')
const { join, extname, parse } = require('path')

class Command {
  constructor (fn) {
    if (typeof fn !== 'function') {
      throw new Error('Command must be initialized with a function.')
    }
    this.fn = fn
  }

  run (args) {
    return this.fn(args)
  }
}

readdirSync(join(__dirname, 'command')).forEach(name => {
  if (extname(name) === '.js') {
    module.exports[parse(name).name] = function (config) {
      return (new Command(require('./command/' + name))).run(config)
    }
  }
})

// module.exports = {
//   build: new Command(require('./command/build.js')),
//   dev: new Command(require('./command/dev.js')),
//   serve: new Command(require('./command/serve.js')),
//   start: new Command(require('./command/start.js')),
//   pack: new Command(require('./command/pack.js'))
// }
