'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

exports.wrapPlugin = require('./util/plugin.js')

function defineConfiguration (config) {
  if (typeof config !== 'function' && (typeof config !== 'object' || config === null)) {
    throw new TypeError('Invalid ty configuration')
  }
  return config
}

exports.defineConfiguration = defineConfiguration
