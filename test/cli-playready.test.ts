import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Command } from 'commander'

import * as playready from '../src/lib/playready.js'
import { register } from '../src/cli/playready.js'

vi.mock('../src/lib/playready.js')

const convertKey = vi.mocked(playready.convertKey)
const revertKey = vi.mocked(playready.revertKey)

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

describe('playready command', () => {
  beforeEach(() => {
    convertKey.mockReset()
    revertKey.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('converts a hex key id to its base64 form', async () => {
    convertKey.mockReturnValue('AAAAEAAAAAAAAAAAAAAAAA==')

    const { program } = buildProgram()
    await run(program, 'playready', 'convert', '--key', '10000000000000000000000000000000')

    expect(convertKey).toHaveBeenCalledWith('10000000000000000000000000000000')
    expect(console.log).toHaveBeenCalledWith('AAAAEAAAAAAAAAAAAAAAAA==')
  })

  it('reverts a base64 key id back to hex', async () => {
    revertKey.mockReturnValue('10000000000000000000000000000000')

    const { program } = buildProgram()
    await run(program, 'playready', 'revert', '--key', 'AAAAEAAAAAAAAAAAAAAAAA==')

    expect(revertKey).toHaveBeenCalledWith('AAAAEAAAAAAAAAAAAAAAAA==')
    expect(console.log).toHaveBeenCalledWith('10000000000000000000000000000000')
  })

  it('shows help and does not call convertKey when --key is missing', async () => {
    const { program } = buildProgram()
    await expect(run(program, 'playready', 'convert')).rejects.toThrow()
    expect(convertKey).not.toHaveBeenCalled()
  })

  it('shows help and does not call revertKey when --key is missing', async () => {
    const { program } = buildProgram()
    await expect(run(program, 'playready', 'revert')).rejects.toThrow()
    expect(revertKey).not.toHaveBeenCalled()
  })

  it.each(['playready', 'playready help'])('shows help for "%s"', async (line) => {
    const { program } = buildProgram()
    await expect(run(program, ...line.split(' '))).rejects.toThrow()
    expect(convertKey).not.toHaveBeenCalled()
    expect(revertKey).not.toHaveBeenCalled()
  })

  it('does nothing for an unrecognized operation', async () => {
    const { program } = buildProgram()
    await run(program, 'playready', 'bogus', '--key', 'abc')

    expect(convertKey).not.toHaveBeenCalled()
    expect(revertKey).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
  })
})
