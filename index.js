#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

program
  .version('0.1.0', '-v, --version')
  .option('-w, --widevine', 'Generate Widevine Keys')
  .option('-a, --asset-id [asset-id]', 'Asset ID')
  .option('-U, --key-server-url [key-server-url]', 'Target Key Server')
  .option('-P, --provider [provider]', 'Provider')
  .option('-K, --private-key [private-key]', 'Private Key')
  .option('-V, --private-key-iv [private-key-iv]', 'Private Key IV')
  .parse(process.argv)

if (program.widevine) {
  if (!program.assetId) {
    console.log('Asset ID is Missing')
    process.exit(1)
  }
  let params = {
    assetId: program.assetId,
    widevineUrl: program.keyServerUrl,
    provider: program.provider,
    privateKey: program.privateKey,
    privateKeyIV: program.privateKeyIv
  }

  console.log(params)

  const result = widevine.getKeys(params)
  console.log(result)
}
