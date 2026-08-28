import * as crypto from 'node:crypto'

/**
 * Thin wrapper around `node:crypto` providing SHA1 digests and symmetric
 * encrypt/decrypt helpers with a fixed algorithm, key and IV.
 */
export default class Crypto {
  private readonly algorithm: string
  private readonly key: crypto.CipherKey
  private readonly iv: crypto.BinaryLike

  constructor (algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike = '') {
    this.algorithm = algorithm
    this.key = key
    this.iv = iv
  }

  digest (message: crypto.BinaryLike, digestEncoding: crypto.BinaryToTextEncoding = 'hex'): string {
    return crypto.createHash('sha1').update(message).digest(digestEncoding)
  }

  encrypt (
    message: string,
    messageEncoding: BufferEncoding = 'utf8',
    cipherEncoding: BufferEncoding = 'base64'
  ): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    cipher.setAutoPadding(true)

    return cipher.update(message, messageEncoding, cipherEncoding) + cipher.final(cipherEncoding)
  }

  decrypt (
    encrypted: string,
    cipherEncoding: BufferEncoding = 'base64',
    messageEncoding: BufferEncoding = 'utf8'
  ): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
    decipher.setAutoPadding(true)

    return decipher.update(encrypted, cipherEncoding, messageEncoding) + decipher.final(messageEncoding)
  }
}
