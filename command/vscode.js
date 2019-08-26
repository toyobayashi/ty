const fs = require('fs-extra')
const getPath = require('../util/path.js')
const { dirname } = require('path')

module.exports = function () {
  const target = getPath('.vscode/launch.json')
  const launchJson = require('../config/launch.json')
  if (fs.existsSync(target)) {
    const launchConfig = fs.readJSONSync(target)
    launchConfig.configurations = [
      ...(launchConfig.configurations || []),
      ...launchJson.configurations
    ]
    fs.writeJSONSync(target, launchConfig, { spaces: 2, EOL: process.platform === 'win32' ? '\r\n' : '\n' })
  } else {
    fs.mkdirsSync(dirname(target))
    fs.writeJSONSync(target, launchJson, { spaces: 2, EOL: process.platform === 'win32' ? '\r\n' : '\n' })
  }
}
