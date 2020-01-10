import 'asar-node/lib/autorun/lookup'

// eslint-disable-next-line
const ObjectId = __non_webpack_require__('@tybys/oid')

const hello = document.createElement('h1')
hello.innerHTML = new ObjectId().toHexString()
document.body.append(hello)
