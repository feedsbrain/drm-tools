import { describe, expect, it } from 'vitest'

import { swapEndian, wrapPromise } from '../src/lib/utilities.js'

describe('swapEndian', () => {
  it('byte-swaps the first three GUID fields and leaves the rest intact', () => {
    const input = '0123456789abcdef0123456789abcdef'
    expect(swapEndian(input).toString('hex')).toBe('67452301ab89efcd0123456789abcdef')
  })

  it('is its own inverse', () => {
    const input = 'fedcba9876543210fedcba9876543210'
    const roundTrip = swapEndian(swapEndian(input).toString('hex')).toString('hex')
    expect(roundTrip).toBe(input)
  })

  it('returns a 16-byte buffer', () => {
    expect(swapEndian('00000000000000000000000000000000')).toHaveLength(16)
  })
})

describe('wrapPromise', () => {
  it('resolves fulfilled promises to [null, value]', async () => {
    await expect(wrapPromise(Promise.resolve('ok'))).resolves.toEqual([null, 'ok'])
  })

  it('resolves rejected promises to [error]', async () => {
    const error = new Error('boom')
    await expect(wrapPromise(Promise.reject(error))).resolves.toEqual([error])
  })

  it('wraps non-Error rejections in an Error', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const [err, value] = await wrapPromise(Promise.reject('nope'))
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe('nope')
    expect(value).toBeUndefined()
  })
})
