const utils = require('./utilities')

const convertKey = (hexStringKey) => {
  let keyId = utils.swapEndian(hexStringKey)
  return keyId.toString('base64')
}

const revertKey = (base64StringKey) => {
  let keyId = utils.swapEndian(Buffer.from(base64StringKey, 'base64').toString('hex'))
  return keyId.toString('hex')
}

module.exports = {
  convertKey,
  revertKey
}
