const { join, resolve } = require('path')

const context = process.env.TY_CONTEXT ? resolve(process.env.TY_CONTEXT) : process.cwd()

function getPath (...relative) {
  return join(context, ...relative)
}

module.exports = getPath
