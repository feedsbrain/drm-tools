import { describe, expect, it } from 'vitest'

import { convertKey, revertKey } from '../src/lib/playready.js'

describe('playready key conversion', () => {
  const hexKeyId = '10000000000000000000000000000000'
  const base64KeyId = 'AAAAEAAAAAAAAAAAAAAAAA=='

  it('convertKey produces the endian-swapped base64 key id', () => {
    expect(convertKey(hexKeyId)).toBe(base64KeyId)
  })

  it('revertKey produces the plain hex key id', () => {
    expect(revertKey(base64KeyId)).toBe(hexKeyId)
  })

  it('convertKey and revertKey round-trip', () => {
    const original = '279926496a7f5d25c68f966b8d5e5d5e'
    expect(revertKey(convertKey(original))).toBe(original)
  })
})
