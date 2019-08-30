module.exports = function register (context) {
  const PathUtil = require('./path.js')
  const Module = require('module')
  const target = (new PathUtil(context)).getPath('node_modules')

  const originalResolveLookupPaths = Module._resolveLookupPaths

  Module._resolveLookupPaths = originalResolveLookupPaths.length === 2 ? function (request, parent) {
    const result = originalResolveLookupPaths.call(Module, request, parent)

    if (!result) return result

    if (request[0] !== '.' && result.indexOf(target) === -1) {
      result.unshift(target)
    }

    return result
  } : function (request, parent, newReturn) {
    const result = originalResolveLookupPaths.call(Module, request, parent, newReturn)

    const paths = newReturn ? result : result[1]
    if (request[0] !== '.' && paths.indexOf(target) === -1) {
      paths.unshift(target)
    }

    return result
  }
}
