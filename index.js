#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

program
  .version('0.1.0', '-v, --version')
  .option('-w, --widevine', 'Generate Widevine Keys')
  .option('-a, --asset-id [asset-id]', 'Asset ID')
  .option('-k, --key-server-url [key-server-url]', 'Target Key Server')
  .option('-p, --provider [provider]', 'Provider')
  .option('-pk, --private-key [private-key]', 'Private Key')
  .option('-iv, --private-key-iv [private-key-iv]', 'Private Key IV')
  .parse(process.argv)
  
  if (program.widevine) {
    if (!program.assetId) {
      console.log('Asset ID is Missing')
      return
    }
    let params = {
        assetId: program.assetId,
        widevineUrl: program.keyServerUrl ? program.keyServerUrl : 'https://license.uat.widevine.com/cenc/getcontentkey',
        provider: program.provider ? program.provider : 'widevine_test',
        privateKey: program.privateKey ? program.privateKey : '1ae8ccd0e7985cc0b6203a55855a1034afc252980e970ca90e5202689f947ab9',
        privateKeyIV: program.privateKeyIV ? program.privateKeyIV : 'd58ce954203b7c9a9a9d467f59839249'
    }
    
    const result = widevine.getKeys(params)
    console.log(result)
  }
  