#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

let command

program
  .command('widevine [operation]')
  .description('Widevine DRM Command Line Tools')
  .option('--content-id [id]', 'Content ID')
  .option('--url [url]', 'Target key server URL')
  .option('--provider [provider]', 'Provider (for Widevine)')
  .option('--key [key]', 'Private Key')
  .option('--key-iv [kiv]', 'Private Key IV')
  .action(function (operation, options) {
    command = 'widevine'
    if (operation === 'key') {
      if (!options.contentId || !options.url || !options.provider || !options.key || !options.keyIv) {
        this.help()
        process.exit(1)
      }
      let params = {
        contentId: options.contentId,
        widevineUrl: options.url,
        provider: options.provider,
        privateKey: options.key,
        privateKeyIV: options.keyIv
      }

      widevine.getKeys(params).then((keys) => {
        console.log(JSON.stringify(keys, null, 2))
      })
    }
    if (!operation) {
      this.help()
      process.exit(1)
    }
  })

program.on('command:*', function () {
  console.error('Invalid Command: %s\n', program.args.join(' '))
  program.help()
  process.exit(1)
})

program
  .usage('<command> -h for help')
  .version('0.0.1', '-v, --version')
  .parse(process.argv)

if (!command) {
  program.help()
}
