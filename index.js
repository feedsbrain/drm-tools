#!/usr/bin/env node

const program = require('commander')
const widevine = require('./lib/widevine')

let showHelp = true

program
  .command('widevine [operation]', /^(pssh|key|help)$/i, 'help')
  .usage('[operation] [options]\n\nOperations:\n - key : Tools to get Widevine content key\n - pssh: Tools to work with Widevine PSSH')
  .option('--content-id [id]', 'Content ID')
  .option('--url [url]', 'Target key server URL')
  .option('--provider [provider]', 'Provider (for Widevine)')
  .option('--key [key]', 'Private Key')
  .option('--key-iv [kiv]', 'Private Key IV')
  .option('--track [value]', 'DRM Track Type', /^(SD|HD|AUDIO|ALL)$/i, 'ALL')
  .action(function (operation, options) {
    showHelp = false
    if (operation && operation.toLowerCase() === 'key') {
      if (!options.contentId || !options.url || !options.provider || !options.key || !options.keyIv) {
        this.help()
        process.exit(1)
      }
      let tracks = [
        { type: 'SD' },
        { type: 'HD' },
        { type: 'AUDIO' }
      ]
      if (options.track && options.track.toUpperCase() !== 'ALL') {
        // Individual Track
        tracks = [
          { type: options.track.toUpperCase() }
        ]
      }
      let params = {
        contentId: options.contentId,
        tracks: tracks,
        widevineUrl: options.url,
        provider: options.provider,
        privateKey: options.key,
        privateKeyIV: options.keyIv
      }

      widevine.getKeys(params).then((keys) => {
        console.log(JSON.stringify(keys, null, 2))
      })
    }
    if (operation && operation.toLowerCase() === 'pssh') {
    }
    if (!operation || (operation && operation.toLowerCase() === 'help')) {
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
  .description('Widevine DRM Command Line Tools')
  .usage('<command> -h for help')
  .version('0.0.1', '-v, --version')
  .parse(process.argv)

if (showHelp) {
  program.help()
}
