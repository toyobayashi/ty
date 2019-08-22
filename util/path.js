const { join, resolve } = require('path')

const context = process.env.TY_ROOT ? resolve(process.env.TY_ROOT) : process.cwd()

function getPath (...relative) {
  return join(context, ...relative)
}

module.exports = getPath
