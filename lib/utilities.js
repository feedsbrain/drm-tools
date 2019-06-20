const swapEndian = (keyId) => {
    // To deal with Microsoft GUID endianness
    const keyIdBytes = Buffer.from(keyId, 'hex')
    const keyIdBuffer = Buffer.concat(
        [
            keyIdBytes.slice(0, 4).swap32(),
            keyIdBytes.slice(4, 6).swap16(),
            keyIdBytes.slice(6, 8).swap16(),
            keyIdBytes.slice(8, 16)
        ],
        DRM_AES_KEYSIZE_128
    )
    return keyIdBuffer
}

const wrapPromise = (promise) => {
    return new Promise((resolve) => {
        promise.then(r => {
            return resolve([null, r])
        }).catch(e => {
            return resolve([e])
        })
    })
}

module.exports = {
    swapEndian,
    wrapPromise
}