try {
  const ts = require('typescript')
  if (ts.classPrivateFieldGetHelper) {
    ts.classPrivateFieldGetHelper.importName = ts.classPrivateFieldGetHelper.importName || '__classPrivateFieldGet'
  }
  if (ts.classPrivateFieldSetHelper) {
    ts.classPrivateFieldSetHelper.importName = ts.classPrivateFieldSetHelper.importName || '__classPrivateFieldSet'
  }
} catch (_) {}
