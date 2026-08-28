import axios from 'axios'

import Crypto from './encryption.js'
import { wrapPromise } from './utilities.js'

export interface Track {
  type: string
}

export interface GetKeysParams {
  contentId: string
  tracks: Track[]
  widevineUrl: string
  provider: string
  privateKey: string
  privateKeyIV: string
}

export interface KeyTrack {
  type: string
  key_id: string
  key: string
  [extra: string]: unknown
}

export interface GetKeysResponse {
  tracks: KeyTrack[]
  [extra: string]: unknown
}

/**
 * Build a signed Widevine key request, POST it to the key server and return the
 * decoded response.
 *
 * On a transport error the process exits with code 1, matching the original CLI
 * behaviour.
 */
export const getKeys = async ({
  contentId,
  tracks,
  widevineUrl,
  provider,
  privateKey,
  privateKeyIV
}: GetKeysParams): Promise<GetKeysResponse> => {
  // Construct request payload
  const base64AssetId = Buffer.from(contentId).toString('base64')
  const wvRequest = {
    content_id: base64AssetId,
    tracks,
    drm_types: ['WIDEVINE']
  }

  // Create signature
  const message = JSON.stringify(wvRequest)
  const base64Message = Buffer.from(message).toString('base64')

  const cryptoHelper = new Crypto(
    'aes-256-cbc',
    Buffer.from(privateKey, 'hex'),
    Buffer.from(privateKeyIV, 'hex')
  )

  // Calculate SHA1 hash for the message, then encrypt it as the signature
  const sha1Message = cryptoHelper.digest(message, 'hex')
  const signature = cryptoHelper.encrypt(sha1Message, 'hex', 'base64')

  const requestData = {
    request: base64Message,
    signature,
    signer: provider
  }

  const [err, result] = await wrapPromise(
    axios({ method: 'post', url: widevineUrl, data: requestData })
  )
  if (err != null || result == null) {
    console.log(err)
    process.exit(1)
  }

  const buff = Buffer.from(result.data.response, 'base64')
  const text = buff.toString('utf-8')

  return JSON.parse(text) as GetKeysResponse
}
