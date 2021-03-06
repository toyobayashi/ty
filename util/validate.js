const cliSupportOption = [
  'mode',
  'arch',
  'target',
  'devServerHost',
  'devServerPort',
  'devServerOpenBrowser',
  'webpack',
  'ts',
  'vue',
  'eslint',
  'sass',
  'less',
  'stylus',
  'context',
  'productionSourcemap',
  'generate',
  'progress',
  'define',
  'extractcss'
]

const shouldBeObject = ['output', 'out', 'tsconfig', 'inno', 'alias', 'devtool', 'define', 'asarOptions', 'nodeExternals', 'packagerOptions', 'pluginImplementation']

module.exports = {
  cliSupportOption,
  shouldBeObject
}
