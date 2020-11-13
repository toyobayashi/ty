/* eslint-disable camelcase */

function wrapPlugin (name, Constructor) {
  return class extends Constructor {
    get __ty_webpack_plugin_name__ () {
      return name || ''
    }

    constructor (options) {
      super(options)
      this.__ty_webpack_plugin_options__ = options
    }
  }
}

module.exports = wrapPlugin
