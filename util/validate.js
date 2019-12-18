const cliSupportOption = [
  'mode',
  'arch',
  'target',
  'devServerHost',
  'devServerPort',
  'devServerOpenBrowser',
  'ts',
  'context',
  'productionSourcemap',
  'cssModule',
  'generate',
  'progress',
  'define',
  'extractcss'
]

const shouldBeObject = ['output', 'out', 'tsconfig', 'inno', 'alias', 'devtool', 'define']

module.exports = {
  cliSupportOption,
  shouldBeObject
}
