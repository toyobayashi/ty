const path = require('path')
const { existsSync, mkdirsSync, writeFileSync } = require('fs-extra')
const getPath = require('./path.js')

function ensureFile (filepath, data = '') {
  if (path.extname(filepath) === '') filepath += '.js'
  if (!existsSync(filepath)) {
    mkdirsSync(path.dirname(filepath))
    writeFileSync(filepath, data, 'utf8')
  }
}

function ensureEntry (entry) {
  if (typeof entry === 'string') {
    ensureFile(getPath(entry))
  } else if (Array.isArray(entry)) {
    entry.forEach(e => ensureFile(getPath(e)))
  } else if (Object.prototype.toString.call(entry) === '[object Object]') {
    for (const name in entry) {
      ensureEntry(entry[name])
    }
  }
}

module.exports = {
  ensureFile,
  ensureEntry
}
