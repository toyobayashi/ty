const { join, resolve, isAbsolute } = require('path')

const context = process.env.TY_CONTEXT ? resolve(process.env.TY_CONTEXT) : process.cwd()

function getPath (...relative) {
  if (!relative.length) {
    return context
  }

  if (isAbsolute(relative[0])) {
    return join(...relative)
  }

  return join(context, ...relative)
}

module.exports = getPath
