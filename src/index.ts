#!/usr/bin/env node

import { readFileSync } from 'node:fs'

import { Command } from 'commander'

import { register as registerWidevine } from './cli/widevine.js'

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string }

const program = new Command()

program
  .name('drmtools')
  .description('Widevine DRM Command Line Tools')
  .usage('<command> -h for help')
  .version(version, '-v, --version')
  .showHelpAfterError()

// register widevine cli
registerWidevine(program)

program.parse(process.argv)

// show help if no argument passes
if (process.argv.length < 3) {
  program.help()
}
