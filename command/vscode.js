/* eslint-disable no-template-curly-in-string */

const fs = require('fs-extra')
const PathUtil = require('../util/path.js')
const path = require('path')

module.exports = function (config) {
  const pathUtil = new PathUtil(config.context)
  const target = pathUtil.getPath('.vscode/launch.json')
  let launchJson
  if (config.target === 'electron') {
    launchJson = {
      version: '0.2.0',
      configurations: [
        {
          type: 'node',
          request: 'attach',
          port: 9222,
          name: 'Attach to Main Process',
          processId: '${command:PickProcess}'
        },
        {
          type: 'chrome',
          request: 'attach',
          name: 'Attach to Renderer Process',
          port: 9222,
          webRoot: path.posix.join('${workspaceFolder}', config.contentBase),
          sourceMaps: true,
          sourceMapPathOverrides: {
            'webpack:///*': '${workspaceFolder}/*',
            'webpack:///./*': '${workspaceFolder}/*'
          }
        },
        {
          name: 'Launch Main Process',
          type: 'node',
          request: 'launch',
          cwd: '${workspaceFolder}',
          runtimeExecutable: '${workspaceFolder}/node_modules/.bin/electron',
          console: 'integratedTerminal',
          windows: {
            runtimeExecutable: '${workspaceFolder}\\node_modules\\.bin\\electron.cmd'
          },
          runtimeArgs: [
            '--remote-debugging-port=9222',
            path.posix.join('${workspaceFolder}', config.localResourcesPath, 'app')
          ],
          sourceMaps: true,
          protocol: 'inspector'
        }
      ]
    }
  } else if (config.target === 'node') {
    launchJson = {
      version: '0.2.0',
      configurations: [
        {
          type: 'node',
          request: 'attach',
          port: 9222,
          name: 'Attach to Main Process',
          processId: '${command:PickProcess}'
        },
        {
          name: 'Launch Main Process',
          type: 'node',
          request: 'launch',
          cwd: '${workspaceFolder}',
          program: '${workspaceFolder}',
          console: 'integratedTerminal',
          sourceMaps: true,
          protocol: 'inspector'
        }
      ]
    }
  } else {
    launchJson = {
      version: '0.2.0',
      configurations: [
        {
          type: 'chrome',
          request: 'attach',
          name: 'Attach to Chrome',
          port: 9222,
          webRoot: path.posix.join('${workspaceFolder}', config.contentBase),
          sourceMaps: true,
          sourceMapPathOverrides: {
            'webpack:///*': '${workspaceFolder}/*',
            'webpack:///./*': '${workspaceFolder}/*'
          }
        },
        {
          type: 'chrome',
          request: 'launch',
          name: 'Launch Chrome Remote',
          port: 9222,
          url: `http://localhost:${config.devServerPort}`,
          webRoot: path.posix.join('${workspaceFolder}', config.contentBase),
          sourceMaps: true,
          sourceMapPathOverrides: {
            'webpack:///*': '${workspaceFolder}/*',
            'webpack:///./*': '${workspaceFolder}/*'
          }
        },
        {
          type: 'chrome',
          request: 'launch',
          name: 'Launch Chrome Local',
          port: 9222,
          url: '${workspaceFolder}/dist/index.html',
          webRoot: '${workspaceFolder}/dist',
          sourceMaps: true,
          sourceMapPathOverrides: {
            'webpack:///*': '${workspaceFolder}/*',
            'webpack:///./*': '${workspaceFolder}/*'
          }
        }
      ]
    }
  }

  if (fs.existsSync(target)) {
    const launchConfig = fs.readJSONSync(target)
    launchConfig.configurations = [
      ...(launchConfig.configurations || []),
      ...launchJson.configurations
    ]
    fs.writeJSONSync(target, launchConfig, { spaces: 2, EOL: process.platform === 'win32' ? '\r\n' : '\n' })
  } else {
    fs.mkdirsSync(path.dirname(target))
    fs.writeJSONSync(target, launchJson, { spaces: 2, EOL: process.platform === 'win32' ? '\r\n' : '\n' })
  }
}
