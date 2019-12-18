const path = require('path')
const { existsSync, mkdirsSync, writeFileSync, readFileSync, copySync } = require('fs-extra')

function isNeedEnsure (p) {
  return typeof p === 'string' && (path.isAbsolute(p) || (p[0] === '.'))
}

function ensureFile (filepath, data = '', suffix = '.js') {
  if (path.extname(filepath) === '') filepath += suffix
  if (!existsSync(filepath)) {
    mkdirsSync(path.dirname(filepath))
    writeFileSync(filepath, data, 'utf8')
  }
}

function ensureEntry (entry, getPath, suffix = '.js', template = '', options = null) {
  if (typeof entry === 'string') {
    if (!isNeedEnsure(entry)) return
    ensureFile(getPath(entry), '', suffix)
  } else if (Array.isArray(entry)) {
    entry.forEach(e => {
      if (!isNeedEnsure(e)) return
      if (typeof template === 'string' && template !== '') {
        let dest = getPath(e)
        if (path.extname(dest) === '') dest += suffix
        if (!existsSync(dest)) {
          if (suffix === '.js' || suffix === '.ts') {
            if (!existsSync(dest + 'x')) {
              copyTemplate(template, dest, options)
            }
          } else {
            copyTemplate(template, dest, options)
          }
        }
      } else {
        ensureFile(getPath(e), '', suffix)
      }
    })
  } else if (Object.prototype.toString.call(entry) === '[object Object]') {
    for (const name in entry) {
      ensureEntry(entry[name], getPath, suffix, template, options)
    }
  }
}

function copyTemplate (src, dest, options) {
  const sourceFullPath = path.join(__dirname, '../template', src)
  if (Object.prototype.toString.call(options) === '[object Object]') {
    let content = readFileSync(sourceFullPath, 'utf8')

    content = content.replace(/\{\{\s*(.*?)\s*\}\}/g, function (match, p1, offset, string) {
      if (!p1) {
        return ''
      }
      // eslint-disable-next-line no-new-func
      return (new Function('options', `try { with (options) { return ${p1}; } } catch (err) { return ''; }`))(options)
    })
    mkdirsSync(path.dirname(dest))
    writeFileSync(dest, content, 'utf8')
  } else {
    mkdirsSync(path.dirname(dest))
    copySync(sourceFullPath, dest)
  }
}

module.exports = {
  ensureFile,
  ensureEntry,
  copyTemplate
}
