import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import axios from 'axios'

import Crypto from '../src/lib/encryption.js'
import { getKeys, type GetKeysParams } from '../src/lib/widevine.js'

vi.mock('axios', () => ({
  default: vi.fn()
}))

const mockedAxios = vi.mocked(axios)

const privateKey = Buffer.alloc(32, 0xab).toString('hex')
const privateKeyIV = Buffer.alloc(16, 0xcd).toString('hex')

const baseParams = (): GetKeysParams => ({
  contentId: 'movie-42',
  tracks: [{ type: 'SD' }, { type: 'HD' }],
  widevineUrl: 'https://license.example/getcontentkey',
  provider: 'acme',
  privateKey,
  privateKeyIV
})

const encodeResponse = (payload: unknown): { data: { response: string } } => ({
  data: { response: Buffer.from(JSON.stringify(payload)).toString('base64') }
})

describe('getKeys', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockedAxios.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('decodes the base64 key-server response', async () => {
    const payload = {
      status: 'OK',
      tracks: [{ type: 'SD', key_id: 'a2lk', key: 'a2V5' }]
    }
    mockedAxios.mockResolvedValue(encodeResponse(payload))

    await expect(getKeys(baseParams())).resolves.toEqual(payload)
  })

  it('POSTs a correctly signed request to the key server', async () => {
    mockedAxios.mockResolvedValue(encodeResponse({ status: 'OK', tracks: [] }))
    const params = baseParams()

    await getKeys(params)

    expect(mockedAxios).toHaveBeenCalledTimes(1)
    const call = mockedAxios.mock.calls[0]?.[0] as unknown as {
      method: string
      url: string
      data: { request: string, signature: string, signer: string }
    }

    expect(call.method).toBe('post')
    expect(call.url).toBe(params.widevineUrl)
    expect(call.data.signer).toBe('acme')

    // request payload is the base64 of the exact JSON the server expects
    const expectedRequest = Buffer.from(
      JSON.stringify({
        content_id: Buffer.from(params.contentId).toString('base64'),
        tracks: params.tracks,
        drm_types: ['WIDEVINE']
      })
    ).toString('base64')
    expect(call.data.request).toBe(expectedRequest)

    // signature is the AES-encrypted SHA1 of that same JSON message
    const helper = new Crypto(
      'aes-256-cbc',
      Buffer.from(privateKey, 'hex'),
      Buffer.from(privateKeyIV, 'hex')
    )
    const message = Buffer.from(expectedRequest, 'base64').toString()
    const expectedSignature = helper.encrypt(helper.digest(message, 'hex'), 'hex', 'base64')
    expect(call.data.signature).toBe(expectedSignature)
  })

  it('exits with code 1 when the transport fails', async () => {
    mockedAxios.mockRejectedValue(new Error('network down'))
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(getKeys(baseParams())).rejects.toThrow('process.exit called')
    expect(exit).toHaveBeenCalledWith(1)
  })
})
