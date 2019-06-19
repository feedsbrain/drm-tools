const axios = require('axios')
const crypto = require('crypto')

const { wrapPromise } = require('./utilities')

const getKeys = async ({ assetId, widevineUrl, provider, privateKey, privateKeyIV }) => {
  let base64AssetId = Buffer.from(assetId).toString('base64')

  let wvRequest = {
    content_id: base64AssetId,
    tracks: [
      { type: 'SD' },
      { type: 'HD' },
      { type: 'AUDIO' }
    ]
  }

  let base64Request = Buffer.from(JSON.stringify(wvRequest)).toString('base64')
  let shasumRequest = crypto.createHash('sha1').update(base64Request).digest('hex')
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(privateKey, 'hex'), Buffer.from(privateKeyIV, 'hex'))
  let signature = cipher.update(Buffer.from(shasumRequest), 'hex') + cipher.final('hex')

  let requestData = {
    request: base64Request,
    signature: signature,
    signer: provider
  }

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