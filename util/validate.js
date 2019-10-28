const cliSupportOption = [
  'mode',
  'arch',
  'target',
  'devServerHost',
  'devServerPort',
  'ts',
  'context',
  'productionSourcemap',
  'cssModule',
  'generate',
  'progress',
  'define'
]

const shouldBeObject = ['output', 'out', 'tsconfig', 'inno', 'alias', 'devtool', 'define']

module.exports = {
  cliSupportOption,
  shouldBeObject
}
