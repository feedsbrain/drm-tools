const axios = require('axios')

const Crypto = require('./encryption')
const { wrapPromise } = require('./utilities')

const getKeys = async ({ contentId, widevineUrl, provider, privateKey, privateKeyIV }) => {
  // Construct request payload
  const base64AssetId = Buffer.from(contentId).toString('base64')
  const wvRequest = {
    content_id: base64AssetId,
    tracks: [
      { type: 'SD' },
      { type: 'HD' },
      { type: 'AUDIO' }
    ],
    drm_types: ['WIDEVINE']
  }

  // Create signature
  const message = JSON.stringify(wvRequest) // Convert payload to JSON string
  const base64Message = Buffer.from(message).toString('base64') // Encode to Base64 for request payload

  const cryptoHelper = new Crypto('aes-256-cbc', Buffer.from(privateKey, 'hex'), Buffer.from(privateKeyIV, 'hex'))

  // Calculate SHA1 hash for the message
  const sha1Message = cryptoHelper.digest(message, 'hex')
  const signature = cryptoHelper.encrypt(sha1Message, 'hex', 'base64')

  //  Widevine request
  const requestData = {
    request: base64Message,
    signature: signature,
    signer: provider
  }
  
  const [err, result] = await wrapPromise(axios({
    method: 'post',
    url: widevineUrl,
    data: requestData
  }))
  if (err) {
    console.log(err)
    process.exit(1)
  }

  const buff = Buffer.from(result.data.response, 'base64')
  const text = buff.toString('utf-8')

  return JSON.parse(text)
}

module.exports = {
  getKeys
}
