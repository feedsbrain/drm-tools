const crypto = require('crypto')

module.exports = class Crypto {
  constructor (algorithm, key, iv = '') {
    this.algorithm = algorithm
    this.key = key
    this.iv = iv
  }

  encrypt (message, messageEncoding = 'utf8', cipherEncoding = 'base64') {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    cipher.setAutoPadding(true)

    let encrypted = cipher.update(message, messageEncoding, cipherEncoding)
    encrypted += cipher.final(cipherEncoding)

    return encrypted
  }

  decrypt (encrypted, cipherEncoding = 'base64', messageEncoding = 'utf8') {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
    decipher.setAutoPadding(true)

    let decrypted = decipher.update(encrypted, cipherEncoding, messageEncoding)
    decrypted += decipher.final(messageEncoding)

    return decrypted
  }
}
