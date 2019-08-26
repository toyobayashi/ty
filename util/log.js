const chalk = require('chalk')

class Log {}

Log.print = function (msg) {
  process.stdout.write(chalk.greenBright(`[${new Date().toLocaleString()}] ${msg}`))
}

Log.info = function (msg) {
  console.log(chalk.greenBright(`[${new Date().toLocaleString()}] ${msg}`))
}

Log.warn = function (msg) {
  console.log(chalk.yellowBright(`[${new Date().toLocaleString()}] ${msg}`))
}

Log.error = function (msg) {
  console.error(chalk.redBright(`[${new Date().toLocaleString()}] ${msg}`))
}

module.exports = Log
