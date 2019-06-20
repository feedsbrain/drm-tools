#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

program
  .usage('[options]')
  .version('0.1.0', '--version')
  .option('-w, --widevine', 'Get Widevine content keys')
  .option('-r, --playready', 'Get Playready content keys')
  .option('-c, --content-id [id]', 'Content ID')
  .option('-u, --url [url]', 'Target key server URL')
  .option('-p, --provider [provider]', 'Provider (for Widevine)')
  .option('-k, --key [key]', 'Private Key')
  .option('-v, --kiv [kiv]', 'Private Key IV')
  .parse(process.argv)

if (program.widevine) {
  if (!program.contentId) {
    console.log('Content ID is Missing')
    process.exit(1)
  }
  let params = {
    contentId: program.contentId,
    widevineUrl: program.url,
    provider: program.provider,
    privateKey: program.key,
    privateKeyIV: program.kiv
  }

  console.log(params)
  widevine.getKeys(params).then((keys) => {
    console.log(keys)
  })
}

if (program.playready) {
}

if (!program.widevine && !program.playready) {
  program.help()
}