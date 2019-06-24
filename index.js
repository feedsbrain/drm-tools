#!/usr/bin/env node

const program = require('commander')
const widevine = require('./cli/widevine')

// register widevine cli
widevine.register(program)

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

// show help if no argument passes
if (process.argv.length < 3) {
  program.help()
}
