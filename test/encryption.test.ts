import { describe, expect, it } from 'vitest'

import Crypto from '../src/lib/encryption.js'

const key = Buffer.alloc(32, 7)
const iv = Buffer.alloc(16, 3)

describe('Crypto.digest', () => {
  it('computes a hex SHA1 digest by default', () => {
    const helper = new Crypto('aes-256-cbc', key, iv)
    expect(helper.digest('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })

  it('honours the requested digest encoding', () => {
    const helper = new Crypto('aes-256-cbc', key, iv)
    expect(helper.digest('abc', 'base64')).toBe('qZk+NkcGgWq6PiVxeFDCbJzQ2J0=')
  })
})

describe('Crypto encrypt/decrypt', () => {
  it('encrypts deterministically with aes-256-cbc', () => {
    const helper = new Crypto('aes-256-cbc', key, iv)
    expect(helper.encrypt('hello world')).toBe('dG9LW9eycOVEASme6D9jWw==')
  })

  it('round-trips an encrypted message', () => {
    const helper = new Crypto('aes-256-cbc', key, iv)
    const cipherText = helper.encrypt('the quick brown fox')
    expect(helper.decrypt(cipherText)).toBe('the quick brown fox')
  })

  it('round-trips a hex-encoded payload', () => {
    const helper = new Crypto('aes-256-cbc', key, iv)
    const cipherText = helper.encrypt('deadbeef', 'hex', 'base64')
    expect(helper.decrypt(cipherText, 'base64', 'hex')).toBe('deadbeef')
  })
})
