import { type Command } from 'commander'

import * as playready from '../lib/playready.js'

export interface PlayReadyOptions {
  key?: string
}

/**
 * Register the `playready` sub-command on the given commander program.
 */
export const register = (program: Command): void => {
  program
    .command('playready [operation]')
    .description('Tools to convert PlayReady key ids')
    .usage(
      '[operation] [options]\n\n' +
      'Operations:\n' +
      ' - convert : Convert a hex key id to its base64 (endian-swapped) form\n' +
      ' - revert  : Convert a base64 (endian-swapped) key id back to hex'
    )
    .option('--key <value>', 'Key ID to convert or revert')
    .action((operation: string | undefined, options: PlayReadyOptions, command: Command): void => {
      const op = operation?.toLowerCase()

      if (op === 'convert') {
        if (options.key == null) {
          command.help({ error: true })
          return
        }
        console.log(playready.convertKey(options.key))
        return
      }

      if (op === 'revert') {
        if (options.key == null) {
          command.help({ error: true })
          return
        }
        console.log(playready.revertKey(options.key))
        return
      }

      if (op == null || op === 'help') {
        command.help({ error: true })
      }
    })
}
