const { join, resolve, isAbsolute, dirname } = require('path')
const { existsSync } = require('fs-extra')

class PathUtil {
  constructor (context) {
    if (typeof context === 'string' && context !== '') {
      this.context = resolve(context)
    } else {
      if (process.env.TY_CONTEXT) {
        this.context = resolve(process.env.TY_CONTEXT)
      } else {
        const root = PathUtil.findProjectRoot()
        if (root !== '') {
          this.context = root
        } else {
          this.context = process.cwd()
        }
      }
    }
  }

  getPath (...relative) {
    if (!relative.length) {
      return this.context
    }

    if (isAbsolute(relative[0])) {
      return join(...relative)
    }

    return join(this.context, ...relative)
  }
}

PathUtil.findProjectRoot = function findProjectRoot (start = process.cwd()) {
  let current = start
  let previous = ''
  do {
    if (existsSync(join(current, 'package.json'))) {
      return current
    }
    previous = current
    current = dirname(current)
  } while (current !== previous)
  return ''
}

module.exports = PathUtil
