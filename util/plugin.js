/* eslint-disable camelcase */

const pluginMap = new Map()

function wrapPlugin (name, Constructor) {
  if (pluginMap.has(name)) return pluginMap.get(name)
  if (typeof Constructor !== 'function') throw new TypeError('The second parameter of wrapPlugin() must be a class constructor')
  if (Constructor.__ty_wrapped_plugin__) return Constructor
  class WrappedPlugin extends Constructor {
    get __ty_webpack_plugin_name__ () {
      return name || ''
    }

    constructor (options) {
      super(options)
      this.__ty_webpack_plugin_options__ = options
    }
  }

  Object.defineProperty(WrappedPlugin, '__ty_wrapped_plugin__', { value: true })
  pluginMap.set(name, WrappedPlugin)
  return WrappedPlugin
}

module.exports = wrapPlugin
