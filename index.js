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

module.exports = {
  build: new Command(require('./command/build.js')),
  dev: new Command(require('./command/dev.js')),
  serve: new Command(require('./command/serve.js')),
  start: new Command(require('./command/start.js'))
}
