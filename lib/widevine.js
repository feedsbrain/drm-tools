const axios = require('axios')
const crypto = require('crypto')

const Crypto = require('./encryption')
const { wrapPromise } = require('./utilities')

const getKeys = async ({ assetId, widevineUrl, provider, privateKey, privateKeyIV }) => {
  let base64AssetId = Buffer.from(assetId).toString('base64')

  let wvRequest = {
    content_id: base64AssetId,
    tracks: [
      { type: 'SD' },
      { type: 'HD' },
      { type: 'AUDIO' }
    ],
    drm_types: ['WIDEVINE']
  }

  let message = JSON.stringify(wvRequest)
  let base64Message = Buffer.from(message).toString('base64')
  let sha1Message = crypto.createHash('sha1').update(message).digest('hex')

  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(privateKey, 'hex'), Buffer.from(privateKeyIV, 'hex'))
  cipher.setAutoPadding(true)

  let signature = cipher.update(sha1Message, 'hex', 'base64')
  signature += cipher.final('base64')

  console.log(sha1Message)
  let enc = new Crypto('aes-256-cbc', Buffer.from(privateKey, 'hex'), Buffer.from(privateKeyIV, 'hex'))
  console.log(enc.decrypt(signature, 'base64', 'hex'))

  let requestData = {
    request: base64Message,
    signature: signature,
    signer: provider
  }

  console.log(requestData)

  let [err, result] = await wrapPromise(axios({
    method: 'post',
    url: widevineUrl,
    data: requestData
  }))
  if (err) {
    console.log(err)
  }

  let buff = Buffer.from(result.data.response, 'base64')
  let text = buff.toString('utf-8')

  let wv = JSON.parse(text)

  console.log(wv)
}

module.exports = {
  getKeys
}
