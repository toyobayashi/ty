module.exports = function register (context) {
  const PathUtil = require('./path.js')
  const Module = require('module')
  const targets = PathUtil.findAllNodeModulesPaths(context)
  const originalResolveLookupPaths = Module._resolveLookupPaths

  Module._resolveLookupPaths = originalResolveLookupPaths.length === 2 ? function (request, parent) {
    const result = originalResolveLookupPaths.call(Module, request, parent)

    if (!result) return result

    if (request[0] !== '.') {
      for (let i = 0; i < targets.length; i++) {
        if (result.indexOf(targets[i]) === -1) {
          result.push(targets[i])
        }
      }
    }

    return result
  } : function (request, parent, newReturn) {
    const result = originalResolveLookupPaths.call(Module, request, parent, newReturn)

    const paths = newReturn ? result : result[1]

    if (request[0] !== '.') {
      for (let i = 0; i < targets.length; i++) {
        if (paths.indexOf(targets[i]) === -1) {
          paths.push(targets[i])
        }
      }
    }

    return result
  }
}
