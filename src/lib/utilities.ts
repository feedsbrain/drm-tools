const DRM_AES_KEYSIZE_128 = 16

/**
 * Swap the byte order of a 16-byte key id to deal with Microsoft GUID endianness.
 *
 * @param keyId - Hex-encoded 16-byte key id.
 * @returns A 16-byte Buffer with the first three fields byte-swapped.
 */
export const swapEndian = (keyId: string): Buffer => {
  const keyIdBytes = Buffer.from(keyId, 'hex')
  return Buffer.concat(
    [
      keyIdBytes.subarray(0, 4).swap32(),
      keyIdBytes.subarray(4, 6).swap16(),
      keyIdBytes.subarray(6, 8).swap16(),
      keyIdBytes.subarray(8, 16)
    ],
    DRM_AES_KEYSIZE_128
  )
}

export type Settled<T> = [Error] | [null, T]

/**
 * Resolve a promise into a `[error]` / `[null, value]` tuple so callers can
 * handle failures without a try/catch.
 */
export const wrapPromise = async <T>(promise: Promise<T>): Promise<Settled<T>> => {
  return await new Promise<Settled<T>>((resolve) => {
    promise
      .then((value) => { resolve([null, value]) })
      .catch((error: unknown) => {
        resolve([error instanceof Error ? error : new Error(String(error))])
      })
  })
}
