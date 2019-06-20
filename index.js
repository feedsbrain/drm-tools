#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

let command

program
  .command('widevine')
  .description('widevine drm tools')
  .option('--content-id [id]', 'Content ID')
  .option('--url [url]', 'Target key server URL')
  .option('--provider [provider]', 'Provider (for Widevine)')
  .option('--key [key]', 'Private Key')
  .option('--key-iv [kiv]', 'Private Key IV')
  .action(function(){
    command = 'widevine'
    if (!program.contentId) {
      program.help()
      process.exit(1)
    }
    let params = {
      contentId: program.contentId,
      widevineUrl: program.url,
      provider: program.provider,
      privateKey: program.key,
      privateKeyIV: program.keyIv
    }
  
    console.log(params)
    widevine.getKeys(params).then((keys) => {
      console.log(keys)
    })
  })

program
  .usage('<command> -h for help')
  .version('0.0.1', '-v, --version')
  .parse(process.argv)

if (!command) {
  program.help()
}