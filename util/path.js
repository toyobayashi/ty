const { join, resolve, isAbsolute, dirname } = require('path')
const { existsSync, statSync } = require('fs-extra')

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

PathUtil.findProjectRoot = function findProjectRoot (start) {
  let current = start ? resolve(start) : process.cwd()
  let previous = ''
  do {
    const target = join(current, 'package.json')
    if (existsSync(target) && statSync(target).isFile()) {
      return current
    }
    previous = current
    current = dirname(current)
  } while (current !== previous)
  return ''
}

PathUtil.findAllNodeModulesPaths = function findAllNodeModulesPaths (start) {
  let current = start ? resolve(start) : process.cwd()
  let previous = ''
  const res = []
  do {
    const target = join(current, 'node_modules')
    if (existsSync(target) && statSync(target).isDirectory()) {
      res.push(target)
    }
    previous = current
    current = dirname(current)
  } while (current !== previous)
  return res
}

module.exports = PathUtil
