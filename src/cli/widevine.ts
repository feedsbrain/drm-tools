import { type Command, InvalidArgumentError } from 'commander'

import * as widevine from '../lib/widevine.js'

const TRACK_TYPES = ['SD', 'HD', 'AUDIO', 'ALL'] as const

/**
 * Commander argument parser for `--track`. Normalises to upper case and rejects
 * anything outside {@link TRACK_TYPES}.
 */
export const parseTrack = (value: string): string => {
  const track = value.toUpperCase()
  if (!(TRACK_TYPES as readonly string[]).includes(track)) {
    throw new InvalidArgumentError(`Track must be one of ${TRACK_TYPES.join(', ')}`)
  }
  return track
}

export interface WidevineOptions {
  contentId?: string
  url?: string
  provider?: string
  key?: string
  keyIv?: string
  track: string
  human?: boolean
}

/**
 * Register the `widevine` sub-command on the given commander program.
 */
export const register = (program: Command): void => {
  program
    .command('widevine [operation]')
    .description('Tools to get Widevine content key')
    .usage('[operation] [options]\n\nOperations:\n - key : Tools to get Widevine content key')
    .option('--content-id <id>', 'Content ID')
    .option('--url <url>', 'Target key server URL')
    .option('--provider <provider>', 'Provider (for Widevine)')
    .option('--key <key>', 'Private Key')
    .option('--key-iv <kiv>', 'Private Key IV')
    .option('--track <value>', 'DRM Track Type (SD, HD, AUDIO, ALL)', parseTrack, 'ALL')
    .option('--human', 'Print result in human readable format')
    .action(async (operation: string | undefined, options: WidevineOptions, command: Command): Promise<void> => {
      const op = operation?.toLowerCase()

      if (op === 'key') {
        const { contentId, url, provider, key, keyIv } = options
        if (contentId == null || url == null || provider == null || key == null || keyIv == null) {
          command.help({ error: true })
          return
        }

        let tracks: widevine.Track[] = [
          { type: 'SD' },
          { type: 'HD' },
          { type: 'AUDIO' }
        ]
        if (options.track.toUpperCase() !== 'ALL') {
          // Individual track
          tracks = [{ type: options.track.toUpperCase() }]
        }

        const keys = await widevine.getKeys({
          contentId,
          tracks,
          widevineUrl: url,
          provider,
          privateKey: key,
          privateKeyIV: keyIv
        })

        if (options.human === true) {
          console.log('Formating for human ...')
          for (const track of keys.tracks) {
            track.key_id = Buffer.from(track.key_id, 'base64').toString('hex')
            track.key = Buffer.from(track.key, 'base64').toString('hex')
          }
        }
        console.log(JSON.stringify(keys, null, 2))
        return
      }

      if (op == null || op === 'help') {
        command.help({ error: true })
      }
    })
}
