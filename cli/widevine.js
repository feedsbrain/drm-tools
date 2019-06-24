const widevine = require('../lib/widevine')

const register = (program) => {
  program
    .command('widevine [operation]', /^(key|help)$/i, 'help')
    .usage('[operation] [options]\n\nOperations:\n - key : Tools to get Widevine content key\n - pssh: Tools to work with Widevine PSSH')
    .option('--content-id [id]', 'Content ID')
    .option('--url [url]', 'Target key server URL')
    .option('--provider [provider]', 'Provider (for Widevine)')
    .option('--key [key]', 'Private Key')
    .option('--key-iv [kiv]', 'Private Key IV')
    .option('--track [value]', 'DRM Track Type', /^(SD|HD|AUDIO|ALL)$/i, 'ALL')
    .action(function (operation, options) {
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
      if (!operation || (operation && operation.toLowerCase() === 'help')) {
        this.help()
        process.exit(1)
      }
    })
}

module.exports = {
  register
}
