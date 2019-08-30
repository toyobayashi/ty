const path = require('path')
const { existsSync, mkdirsSync, writeFileSync } = require('fs-extra')

function ensureFile (filepath, data = '', suffix = '.js') {
  if (path.extname(filepath) === '') filepath += suffix
  if (!existsSync(filepath)) {
    mkdirsSync(path.dirname(filepath))
    writeFileSync(filepath, data, 'utf8')
  }
}

function ensureEntry (entry, getPath, suffix = '.js') {
  if (typeof entry === 'string') {
    ensureFile(getPath(entry), '', suffix)
  } else if (Array.isArray(entry)) {
    entry.forEach(e => ensureFile(getPath(e), '', suffix))
  } else if (Object.prototype.toString.call(entry) === '[object Object]') {
    for (const name in entry) {
      ensureEntry(entry[name], getPath, suffix)
    }
  }
}

module.exports = {
  ensureFile,
  ensureEntry
}
