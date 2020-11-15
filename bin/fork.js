const args = process.argv.splice(2, 2)

const register = require('../util/module.js')
register(args[0])

require(args[1])
