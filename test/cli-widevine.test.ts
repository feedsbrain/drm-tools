import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Command } from 'commander'

import * as widevine from '../src/lib/widevine.js'
import { parseTrack, register } from '../src/cli/widevine.js'

vi.mock('../src/lib/widevine.js')

const getKeys = vi.mocked(widevine.getKeys)

const privateKey = Buffer.alloc(32, 0xab).toString('hex')
const privateKeyIV = Buffer.alloc(16, 0xcd).toString('hex')

const buildProgram = (): { program: Command, stdout: string[], stderr: string[] } => {
  const stdout: string[] = []
  const stderr: string[] = []
  const program = new Command()
  program
    .exitOverride()
    .configureOutput({
      writeOut: (str) => stdout.push(str),
      writeErr: (str) => stderr.push(str)
    })
  register(program)
  return { program, stdout, stderr }
}

const run = async (program: Command, ...args: string[]): Promise<void> => {
  await program.parseAsync(args, { from: 'user' })
}

const keyArgs = [
  'widevine', 'key',
  '--content-id', 'movie-42',
  '--url', 'https://license.example',
  '--provider', 'acme',
  '--key', privateKey,
  '--key-iv', privateKeyIV
]

describe('parseTrack', () => {
  it.each([
    ['sd', 'SD'],
    ['Hd', 'HD'],
    ['audio', 'AUDIO'],
    ['ALL', 'ALL']
  ])('normalises %s to %s', (input, expected) => {
    expect(parseTrack(input)).toBe(expected)
  })

  it('rejects unknown track types', () => {
    expect(() => parseTrack('uhd')).toThrow(/Track must be one of/)
  })
})

describe('widevine command', () => {
  beforeEach(() => {
    getKeys.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const logCalls = (): string => vi.mocked(console.log).mock.calls.map((c) => String(c[0])).join('\n')

  it('maps CLI options to getKeys params and prints the JSON result', async () => {
    const result = { status: 'OK', tracks: [{ type: 'SD', key_id: 'a2lk', key: 'a2V5' }] }
    getKeys.mockResolvedValue(result)

    const { program } = buildProgram()
    await run(program, ...keyArgs)

    expect(getKeys).toHaveBeenCalledWith({
      contentId: 'movie-42',
      tracks: [{ type: 'SD' }, { type: 'HD' }, { type: 'AUDIO' }],
      widevineUrl: 'https://license.example',
      provider: 'acme',
      privateKey,
      privateKeyIV
    })
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })

  it('requests a single track when --track is given', async () => {
    getKeys.mockResolvedValue({ status: 'OK', tracks: [] })

    const { program } = buildProgram()
    await run(program, ...keyArgs, '--track', 'hd')

    expect(getKeys).toHaveBeenCalledWith(
      expect.objectContaining({ tracks: [{ type: 'HD' }] })
    )
  })

  it('decodes key material to hex with --human', async () => {
    getKeys.mockResolvedValue({
      status: 'OK',
      tracks: [{
        type: 'SD',
        key_id: Buffer.from('aabbccdd', 'hex').toString('base64'),
        key: Buffer.from('11223344', 'hex').toString('base64')
      }]
    })

    const { program } = buildProgram()
    await run(program, ...keyArgs, '--human')

    const printed = logCalls()
    expect(printed).toContain('"key_id": "aabbccdd"')
    expect(printed).toContain('"key": "11223344"')
  })

  it('rejects an invalid --track without calling getKeys', async () => {
    const { program } = buildProgram()
    await expect(run(program, ...keyArgs, '--track', 'uhd')).rejects.toThrow()
    expect(getKeys).not.toHaveBeenCalled()
  })

  it('shows help and does not call getKeys when required options are missing', async () => {
    const { program } = buildProgram()
    await expect(run(program, 'widevine', 'key')).rejects.toThrow()
    expect(getKeys).not.toHaveBeenCalled()
  })

  it.each(['widevine', 'widevine help'])('shows help for "%s"', async (line) => {
    const { program } = buildProgram()
    await expect(run(program, ...line.split(' '))).rejects.toThrow()
    expect(getKeys).not.toHaveBeenCalled()
  })
})
