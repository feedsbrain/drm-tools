# drm-tools — Technical Specification

> Status: reverse-engineered from the implementation at commit `c54b254`.
> Purpose: a self-contained spec from which this package can be regenerated
> from scratch (spec-driven development). An agent or engineer with only this
> file and a blank directory should be able to reproduce a functionally
> equivalent package, including its CLI surface, library API, and test suite.
>
> Requirement keywords MUST / SHOULD / MAY are used per RFC 2119.

## 1. Purpose

`drm-tools` is a Node.js CLI + library for working with DRM (Digital Rights
Management) systems, currently:

- **Widevine** — request content keys from a Widevine key server (a
  signed, encrypted key-request/response flow).
- **PlayReady** — convert PlayReady key IDs between the two representations
  vendors commonly use for the same 128-bit value: hex (byte order as
  stored) and base64 (Microsoft GUID mixed-endian byte order), both as a
  library and as a `drmtools playready` CLI sub-command.

It ships as a global npm CLI (`drmtools`) and as an importable TypeScript/ESM
library (`dist/index.js` + `.d.ts`).

## 2. Scope & Non-Goals

In scope:
- A `widevine key` CLI operation that calls a Widevine key server.
- Library functions for PlayReady key-id conversion.
- Generic crypto helper (SHA1 digest + symmetric encrypt/decrypt) used to
  sign Widevine requests.
- A small `wrapPromise`/`swapEndian` utility module.

Out of scope (MUST NOT be assumed unless explicitly requested later):
- No license acquisition, no actual DRM decryption/packaging, no key-server
  implementation. This tool is a *client* to a key server, not a server.
- No persistent config file, no interactive prompts — everything is via CLI
  flags.

## 3. Target Environment

- Runtime: Node.js **>= 22.12.0** (developed/tested on Node 24; `.nvmrc` /
  `.tool-versions` pin `24.20.0`).
- Module system: **ESM only** (`"type": "module"` in `package.json`); all
  relative imports use explicit `.js` extensions (even in `.ts` sources),
  per `nodenext` module resolution.
- Language: TypeScript, `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitOverride: true`, target `ES2022`.
- Package manager: npm (uses `package-lock.json`).

## 4. Package Manifest Requirements

`package.json` MUST declare:

| Field | Value |
|---|---|
| `name` | `drm-tools` |
| `description` | `Tools for Widevine and PlayReady` |
| `type` | `module` |
| `main` | `dist/index.js` |
| `types` | `dist/index.d.ts` |
| `bin.drmtools` | `dist/index.js` |
| `files` | `["dist"]` |
| `engines.node` | `>=22.12.0` |
| `license` | `ISC` — permissive, OSI-approved, free for commercial use, no copyleft obligations. The committed `LICENSE` file MUST contain the actual ISC license text (functionally equivalent to MIT) matching this field. |
| dependency `axios` | `^1.20.0` — HTTP client for the key-server POST |
| dependency `commander` | `^15.0.0` — CLI argument parsing |
| devDependency `typescript` | `^7.0.2` |
| devDependency `vitest` + `@vitest/coverage-v8` | `^4.1.11` |
| devDependency `@types/node` | `^24.13.3` |

Scripts (exact names/behavior CLIs and CI MUST be able to rely on):

```
clean          rm -rf dist coverage
build          tsc -p tsconfig.build.json && chmod +x dist/index.js
typecheck      tsc -p tsconfig.json --noEmit
test           vitest run
test:watch     vitest
test:coverage  vitest run --coverage
prepublishOnly npm run clean && npm run build
pub            npm version patch --force && npm publish
```

`dist/index.js` MUST be executable (`chmod +x`) since it is used as the
`bin` entrypoint and starts with a `#!/usr/bin/env node` shebang.

## 5. Repository Layout

```
src/
  index.ts              CLI entrypoint (shebang, commander program, registers sub-commands)
  cli/
    widevine.ts          commander sub-command wiring for `widevine`
    playready.ts          commander sub-command wiring for `playready`
  lib/
    encryption.ts         generic SHA1/AES helper class (Crypto)
    playready.ts           PlayReady key-id hex<->base64 conversion
    utilities.ts            swapEndian, wrapPromise, DRM_AES_KEYSIZE_128 const
    widevine.ts              getKeys(): signed key-server request/response
test/
  cli-widevine.test.ts    CLI-level tests (mocks src/lib/widevine.js)
  cli-playready.test.ts    CLI-level tests (mocks src/lib/playready.js)
  encryption.test.ts        Crypto unit tests with fixed vectors
  playready.test.ts           convertKey/revertKey tests
  utilities.test.ts             swapEndian/wrapPromise tests
  widevine.test.ts                getKeys unit tests (mocks axios)
tsconfig.json           base config, includes src+test, strict
tsconfig.build.json      extends base, src-only, emits to dist/, used for publishing
vitest.config.ts          node environment, v8 coverage over src/**, excludes src/index.ts
.nvmrc / .tool-versions    Node 24.20.0
```

Nothing under `dist/` or `coverage/` is source-controlled input to
regeneration — both are build artifacts (`dist/` is committed today as a
build output but is regenerated by `npm run build`; `coverage/` is
gitignored).

## 6. Module Specifications

### 6.1 `src/lib/utilities.ts`

```ts
export const DRM_AES_KEYSIZE_128 = 16 // (module-private constant, not exported)

export const swapEndian = (keyId: string): Buffer
export type Settled<T> = [Error] | [null, T]
export const wrapPromise = async <T>(promise: Promise<T>): Promise<Settled<T>>
```

**`swapEndian(keyId: string): Buffer`**
- Input: a hex string representing a 16-byte (128-bit) key id / GUID.
- MUST convert the hex string to a 16-byte `Buffer`.
- MUST byte-swap it the way Microsoft mixed-endian GUIDs are derived from
  their big-endian form:
  - bytes `[0..4)` (`Data1`, 32-bit) — reverse byte order (`swap32`).
  - bytes `[4..6)` (`Data2`, 16-bit) — reverse byte order (`swap16`).
  - bytes `[6..8)` (`Data3`, 16-bit) — reverse byte order (`swap16`).
  - bytes `[8..16)` (`Data4`) — left untouched.
- MUST return exactly 16 bytes.
- MUST be its own inverse: `swapEndian(swapEndian(x).toString('hex')).toString('hex') === x`.
- Test vectors (MUST pass):
  - `swapEndian('0123456789abcdef0123456789abcdef').toString('hex')` ===
    `'67452301ab89efcd0123456789abcdef'`
  - `swapEndian('00000000000000000000000000000000')` has length 16.

**`wrapPromise<T>(promise: Promise<T>): Promise<Settled<T>>`**
- MUST never reject; it always resolves.
- On fulfillment with `value`, resolves to `[null, value]`.
- On rejection with an `Error`, resolves to `[error]` (single-element
  array).
- On rejection with a non-`Error` value `v`, resolves to
  `[new Error(String(v))]`.
- This is the project's sole error-handling idiom for promises that would
  otherwise need `try/catch` (used by `widevine.getKeys`).

### 6.2 `src/lib/encryption.ts`

```ts
export default class Crypto {
  constructor(algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike = '')
  digest(message: crypto.BinaryLike, digestEncoding: crypto.BinaryToTextEncoding = 'hex'): string
  encrypt(message: string, messageEncoding: BufferEncoding = 'utf8', cipherEncoding: BufferEncoding = 'base64'): string
  decrypt(encrypted: string, cipherEncoding: BufferEncoding = 'base64', messageEncoding: BufferEncoding = 'utf8'): string
}
```

- Thin wrapper over Node's `node:crypto`. Algorithm, key and IV are fixed
  at construction and reused for every `encrypt`/`decrypt`/`digest` call
  (a new `Cipheriv`/`Decipheriv` is created per call, but from the same
  key/iv/algorithm — this means, e.g., repeated `encrypt()` calls with the
  same plaintext produce the same ciphertext: **deterministic**, CBC mode
  with a fixed IV, by design for this project's Widevine signing use case).
- `digest` MUST hash with **SHA1** regardless of the instance's configured
  cipher algorithm (the algorithm field is not used for `digest`).
- `encrypt`/`decrypt` MUST use `crypto.createCipheriv`/`createDecipheriv`
  with `setAutoPadding(true)`.
- Test vectors (key = 32 bytes of `0x07`, iv = 16 bytes of `0x03`,
  algorithm = `aes-256-cbc`) that MUST pass:
  - `digest('abc')` === `'a9993e364706816aba3e25717850c26c9cd0d89d'` (the
    standard SHA1 test vector for `"abc"`).
  - `digest('abc', 'base64')` === `'qZk+NkcGgWq6PiVxeFDCbJzQ2J0='`.
  - `encrypt('hello world')` === `'dG9LW9eycOVEASme6D9jWw=='`.
  - `decrypt(encrypt('the quick brown fox'))` === `'the quick brown fox'`.
  - `decrypt(encrypt('deadbeef', 'hex', 'base64'), 'base64', 'hex')` ===
    `'deadbeef'`.

### 6.3 `src/lib/playready.ts`

```ts
export const convertKey = (hexStringKey: string): string   // hex -> mixed-endian base64
export const revertKey = (base64StringKey: string): string // mixed-endian base64 -> hex
```

- `convertKey`: hex key id -> `swapEndian(hex)` -> base64 string. Used to
  turn a "plain" hex key id (e.g. as returned by a Widevine-style key
  server, or as stored little/big-endian) into the base64 GUID form
  PlayReady tooling expects.
- `revertKey`: base64 string -> raw bytes -> hex -> `swapEndian(hex)` ->
  hex string. Exact inverse of `convertKey`.
- MUST round-trip: `revertKey(convertKey(x)) === x` for any valid 16-byte
  hex key id `x`.
- Test vectors (MUST pass):
  - `convertKey('10000000000000000000000000000000')` ===
    `'AAAAEAAAAAAAAAAAAAAAAA=='`
  - `revertKey('AAAAEAAAAAAAAAAAAAAAAA==')` ===
    `'10000000000000000000000000000000'`
  - Round trip for `'279926496a7f5d25c68f966b8d5e5d5e'`.

Note: the test hex strings above are 34 hex chars (17 bytes) as written in
the existing test file even though the underlying buffer operations treat
them as 16 bytes; a regenerating implementation MUST preserve
`swapEndian`'s behavior of truncating/concatenating to exactly
`DRM_AES_KEYSIZE_128` (16) bytes via `Buffer.concat([...], 16)`, matching
current behavior exactly (do not "fix" this by validating input length).

### 6.4 `src/lib/widevine.ts`

```ts
export interface Track { type: string }

export interface GetKeysParams {
  contentId: string
  tracks: Track[]
  widevineUrl: string
  provider: string
  privateKey: string     // hex-encoded AES-256 key
  privateKeyIV: string   // hex-encoded 16-byte IV
}

export interface KeyTrack {
  type: string
  key_id: string
  key: string
  [extra: string]: unknown
}

export interface GetKeysResponse {
  tracks: KeyTrack[]
  [extra: string]: unknown
}

export const getKeys = async (params: GetKeysParams): Promise<GetKeysResponse>
```

Algorithm for `getKeys`:

1. Base64-encode `contentId` (UTF-8 bytes) -> `content_id`.
2. Build the plaintext request object:
   ```json
   { "content_id": "<base64 content id>", "tracks": [...tracks], "drm_types": ["WIDEVINE"] }
   ```
3. `message` = `JSON.stringify(requestObject)`.
4. `base64Message` = base64 of `message` (UTF-8) -> this becomes the
   `request` field of the HTTP payload.
5. Signing key material: construct `Crypto('aes-256-cbc', Buffer.from(privateKey, 'hex'), Buffer.from(privateKeyIV, 'hex'))`.
6. `sha1Message` = `crypto.digest(message, 'hex')` (hex-encoded SHA1 of the
   **plaintext JSON message**, not the base64 form).
7. `signature` = `crypto.encrypt(sha1Message, 'hex', 'base64')` (AES-256-CBC
   encrypt the hex-encoded SHA1 digest, output as base64).
8. HTTP payload:
   ```json
   { "request": "<base64Message>", "signature": "<signature>", "signer": "<provider>" }
   ```
9. `POST` this payload as `data` (JSON body) to `widevineUrl` via `axios`
   (`{ method: 'post', url, data }`), wrapped through `wrapPromise` so
   transport errors don't throw.
10. On transport error (`err != null` or `result == null`): `console.log(err)`
    then `process.exit(1)`. This MUST happen (tests assert `process.exit`
    is called with `1` and that a thrown error from a mocked `process.exit`
    propagates — i.e. control flow after `process.exit(1)` MUST NOT
    continue in an environment where `exit` doesn't actually terminate,
    such as tests).
11. On success: `result.data.response` is base64; decode to a UTF-8 string
    and `JSON.parse` it as the `GetKeysResponse`, and return it (no
    validation of the parsed shape beyond the TypeScript types).

This function does not catch parse errors from step 11 — malformed server
responses MUST propagate as thrown exceptions.

### 6.5 `src/cli/widevine.ts`

```ts
export const TRACK_TYPES = ['SD', 'HD', 'AUDIO', 'ALL'] as const
export const parseTrack = (value: string): string   // commander <track> argument parser
export interface WidevineOptions {
  contentId?: string
  url?: string
  provider?: string
  key?: string
  keyIv?: string
  track: string
  human?: boolean
}
export const register = (program: Command): void
```

**`parseTrack(value)`**
- Upper-cases `value`.
- If the upper-cased value is not one of `TRACK_TYPES`, throws
  `commander.InvalidArgumentError('Track must be one of SD, HD, AUDIO, ALL')`.
- Otherwise returns the upper-cased value.
- Used as the custom parser for `--track`, so an invalid `--track` value
  MUST make commander reject the whole command before `.action()` runs
  (i.e. `getKeys` is never called for an invalid track).

**`register(program)`** wires a `widevine [operation]` sub-command:

- Description: `Tools to get Widevine content key`.
- Usage string:
  `[operation] [options]\n\nOperations:\n - key : Tools to get Widevine content key`
- Options (all MUST be present with these exact flags/descriptions):
  - `--content-id <id>` — Content ID
  - `--url <url>` — Target key server URL
  - `--provider <provider>` — Provider (for Widevine)
  - `--key <key>` — Private Key
  - `--key-iv <kiv>` — Private Key IV
  - `--track <value>` — DRM Track Type (SD, HD, AUDIO, ALL), parsed by
    `parseTrack`, default `'ALL'`
  - `--human` — Print result in human readable format (boolean flag)
- Action handler, given `operation` (positional, case-insensitive) and
  parsed `options`:
  - `op = operation?.toLowerCase()`.
  - **If `op === 'key'`:**
    - Requires `contentId`, `url`, `provider`, `key`, `keyIv` all
      non-null; if any is missing, MUST call `command.help({ error: true })`
      and return without calling `getKeys` (this prints usage to stderr and
      — under normal, non-`exitOverride` commander config — exits the
      process; in tests with `exitOverride()` this throws).
    - Track list:
      - If `options.track` (upper-cased) is `'ALL'` (the default), tracks =
        `[{ type: 'SD' }, { type: 'HD' }, { type: 'AUDIO' }]` (in that
        exact order).
      - Otherwise, tracks = `[{ type: options.track.toUpperCase() }]`
        (single track).
    - Calls `widevine.getKeys({ contentId, tracks, widevineUrl: url, provider, privateKey: key, privateKeyIV: keyIv })`
      and awaits the result.
    - If `options.human === true`: logs `'Formating for human ...'` (typo
      MUST be preserved verbatim — it's part of the existing observable
      CLI output), then for every track in `keys.tracks`, replaces
      `track.key_id` and `track.key` by decoding them from base64 to hex
      **in place**, mutating the response object before printing.
    - Always (human or not) prints the final `keys` object via
      `console.log(JSON.stringify(keys, null, 2))`.
  - **If `op` is `undefined`/`null` or `'help'`:** call
    `command.help({ error: true })`.
  - Any other `op` value (unrecognized operation): falls through without
    calling `getKeys` and without printing help (current behavior — MUST
    be preserved: only `undefined`/`'help'` trigger help; anything else
    that isn't `'key'` silently does nothing).

### 6.6 `src/cli/playready.ts`

```ts
export interface PlayReadyOptions {
  key?: string
}
export const register = (program: Command): void
```

`register(program)` wires a `playready [operation]` sub-command:

- Description: `Tools to convert PlayReady key ids`.
- Usage string:
  `[operation] [options]\n\nOperations:\n - convert : Convert a hex key id to its base64 (endian-swapped) form\n - revert  : Convert a base64 (endian-swapped) key id back to hex`
- Options:
  - `--key <value>` — Key ID to convert or revert
- Action handler, given `operation` (positional, case-insensitive) and
  parsed `options`:
  - `op = operation?.toLowerCase()`.
  - **If `op === 'convert'`:** requires `options.key` non-null; if
    missing, MUST call `command.help({ error: true })` and return without
    calling `playready.convertKey`. Otherwise calls
    `playready.convertKey(options.key)` and prints the result via
    `console.log`.
  - **If `op === 'revert'`:** same shape as `convert`, calling
    `playready.revertKey(options.key)` instead.
  - **If `op` is `undefined`/`null` or `'help'`:** call
    `command.help({ error: true })`.
  - Any other unrecognized `op` value silently does nothing (no help, no
    conversion call) — MUST mirror the widevine sub-command's fall-through
    behavior in §6.5 for consistency.
- Unlike `widevine key`, these operations are synchronous (no network I/O)
  so the action handler does not need to be `async`.

### 6.7 `src/index.ts` (bin entrypoint)

- `#!/usr/bin/env node` shebang, TypeScript source compiles as-is (kept as
  the first line).
- Reads `version` from `../package.json` relative to the compiled file
  (via `new URL('../package.json', import.meta.url)` + `readFileSync` +
  `JSON.parse`) — MUST work from the installed `dist/` layout where
  `package.json` is one directory up from `dist/index.js`.
- Builds a single top-level `commander` `Command`:
  - `name('drmtools')`
  - `description('Widevine DRM Command Line Tools')`
  - `usage('<command> -h for help')`
  - `version(version, '-v, --version')`
  - `showHelpAfterError()`
- Registers the widevine sub-command via `registerWidevine(program)`
  (from `./cli/widevine.js`) and the playready sub-command via
  `registerPlayReady(program)` (from `./cli/playready.js`).
- `program.parse(process.argv)`.
- If `process.argv.length < 3` (i.e., no sub-command/arguments given at
  all), calls `program.help()` to print top-level help.
- This file is excluded from unit-test coverage requirements
  (`vitest.config.ts` excludes `src/index.ts`) since it's a thin wiring
  script; it is exercised indirectly by installing/running the built CLI,
  not by unit tests.

## 7. CLI Behavior Contract

Top-level:
```
$ drmtools
Usage: drmtools <command> -h for help
...
```
(prints help and exits when invoked with zero arguments)

```
$ drmtools -v
<version from package.json>
```

Widevine help (MUST match, modulo commander's own formatting):
```
$ drmtools widevine
Usage: drmtools widevine [operation] [options]

Operations:
 - key : Tools to get Widevine content key

Options:
  --content-id <id>      Content ID
  --url <url>            Target key server URL
  --provider <provider>  Provider (for Widevine)
  --key <key>            Private Key
  --key-iv <kiv>         Private Key IV
  --track <value>        DRM Track Type (SD, HD, AUDIO, ALL) (default: "ALL")
  --human                Print result in human readable format
  -h, --help             display help for command
```

Fetching keys:
```
$ drmtools widevine key \
    --content-id <id> --url <license-server-url> --provider <provider> \
    --key <hex-private-key> --key-iv <hex-iv> \
    [--track SD|HD|AUDIO|ALL] [--human]
```
- Prints the JSON key-server response (indent 2) to stdout on success.
- With `--human`, `key_id`/`key` fields in each track are hex instead of
  base64, and a `'Formating for human ...'` line is logged first.
- Exits 1 (via `getKeys`'s internal handling) if the HTTP request to the
  key server fails.
- Missing any of `--content-id/--url/--provider/--key/--key-iv` when
  `operation === key` prints help (as an error) instead of attempting the
  request.
- An invalid `--track` value is rejected by commander before the action
  runs, with message `Track must be one of SD, HD, AUDIO, ALL`.

PlayReady help (MUST match, modulo commander's own formatting):
```
$ drmtools playready
Usage: drmtools playready [operation] [options]

Operations:
 - convert : Convert a hex key id to its base64 (endian-swapped) form
 - revert  : Convert a base64 (endian-swapped) key id back to hex

Options:
  --key <value>  Key ID to convert or revert
  -h, --help     display help for command
```

Converting/reverting a key id:
```
$ drmtools playready convert --key <hex-key-id>
<base64, endian-swapped key id>

$ drmtools playready revert --key <base64-key-id>
<hex key id>
```
- Prints only the converted/reverted value to stdout (no JSON wrapper,
  unlike the widevine `key` operation).
- Missing `--key` for either operation prints help (as an error) instead
  of attempting the conversion.
- An unrecognized operation (anything other than `convert`, `revert`,
  `help`, or no operation) does nothing silently — no output, no help, no
  error (mirrors the widevine sub-command's behavior for consistency).

## 8. Build, Type-Check & Test Tooling

`tsconfig.json` (base, shared by IDE/typecheck/tests):
- `target`/`lib`: `ES2022`
- `module`/`moduleResolution`: `nodenext`
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `skipLibCheck: true`
- `declaration`/`declarationMap`/`sourceMap: true`
- `outDir: dist`, `rootDir: .`
- `include`: `src/**/*`, `test/**/*`, `vitest.config.ts`
- `types: ["node"]`

`tsconfig.build.json` (used by `npm run build`, publish-facing):
- extends base, `rootDir: src`
- `include: src/**/*`; excludes `node_modules`, `dist`, `test`,
  `**/*.test.ts`, `vitest.config.ts` — test files MUST NOT be emitted into
  `dist/`.

`vitest.config.ts`:
- `environment: 'node'`
- `include: ['test/**/*.test.ts']`
- coverage via `@vitest/coverage-v8`, `include: ['src/**/*.ts']`,
  `exclude: ['src/index.ts']`, reporters `text` + `html`.

## 9. Test Suite / Acceptance Criteria

A regenerated project MUST ship a Vitest suite covering at least the
following (mirrors `test/*.test.ts`):

**`utilities.test.ts`**
- `swapEndian` byte-swaps the first three GUID fields and leaves the rest
  intact (exact vector in §6.1).
- `swapEndian` is its own inverse.
- `swapEndian` always returns a 16-byte buffer.
- `wrapPromise` resolves fulfilled promises to `[null, value]`.
- `wrapPromise` resolves rejected promises (with an `Error`) to `[error]`.
- `wrapPromise` wraps non-`Error` rejections (e.g. a rejected string) into
  an `Error` whose `.message` is `String(reason)`.

**`encryption.test.ts`**
- `digest` defaults to hex-encoded SHA1 (vector for `'abc'` in §6.2).
- `digest` honours a requested output encoding (e.g. `'base64'`).
- `encrypt` is deterministic for fixed key/iv/algorithm (exact vector in
  §6.2).
- `encrypt` then `decrypt` round-trips a UTF-8 message.
- `encrypt`/`decrypt` round-trip a hex-encoded payload (in/out encodings
  other than the defaults).

**`playready.test.ts`**
- `convertKey` produces the documented endian-swapped base64 key id.
- `revertKey` produces the plain hex key id from that base64.
- `convertKey`/`revertKey` round-trip an arbitrary 16-byte hex key.

**`widevine.test.ts`** (axios mocked as `vi.mock('axios', () => ({ default: vi.fn() }))`)
- `getKeys` decodes the base64 `response` field of the mocked axios
  result back into the expected JS object.
- `getKeys` POSTs with: `method: 'post'`, `url` equal to `widevineUrl`,
  `data.signer` equal to `provider`, `data.request` equal to the exact
  base64 encoding of `JSON.stringify({ content_id, tracks, drm_types: ['WIDEVINE'] })`,
  and `data.signature` equal to `Crypto(...).encrypt(Crypto(...).digest(message, 'hex'), 'hex', 'base64')`
  computed independently in the test from the same private key/IV — i.e.
  the test recomputes the expected signature rather than hard-coding it,
  so the regenerated signing algorithm MUST match exactly (see §6.4).
- `getKeys` calls `process.exit(1)` (after logging the error) when the
  axios call rejects; the promise returned by `getKeys` MUST propagate
  whatever `process.exit`'s mock does (i.e. don't swallow/catch beyond
  that single log+exit).

**`cli-widevine.test.ts`** (uses commander's `exitOverride()` +
`configureOutput()` to capture help/errors instead of real
`process.exit`; mocks `src/lib/widevine.js`)
- `parseTrack` normalizes case (`'sd' -> 'SD'`, `'Hd' -> 'HD'`,
  `'audio' -> 'AUDIO'`, `'ALL' -> 'ALL'`).
- `parseTrack('uhd')` throws with message matching `/Track must be one of/`.
- Running `widevine key` with all required options maps them 1:1 onto
  `getKeys`'s params (default track expands to `SD`+`HD`+`AUDIO`) and
  prints `JSON.stringify(result, null, 2)` via `console.log`.
- `--track hd` results in `getKeys` being called with
  `tracks: [{ type: 'HD' }]` only.
- `--human` decodes `key_id`/`key` in the printed output from base64 to
  hex (asserted by substring match on the printed JSON).
- An invalid `--track` value rejects (throws, due to `exitOverride`)
  without ever calling `getKeys`.
- Missing required options (e.g. `widevine key` with nothing else) causes
  a rejection (help-as-error path) without calling `getKeys`.
- Running bare `widevine` or `widevine help` also rejects (shows help)
  without calling `getKeys`.

**`cli-playready.test.ts`** (uses the same `exitOverride()` +
`configureOutput()` harness; mocks `src/lib/playready.js`)
- `playready convert --key <hex>` calls `convertKey` with that exact hex
  string and prints its (mocked) return value via `console.log`.
- `playready revert --key <base64>` calls `revertKey` with that exact
  string and prints its (mocked) return value via `console.log`.
- Missing `--key` on either `convert` or `revert` rejects (help-as-error
  path) without calling `convertKey`/`revertKey`.
- Running bare `playready` or `playready help` rejects (shows help)
  without calling `convertKey`/`revertKey`.
- An unrecognized operation (e.g. `playready bogus --key abc`) resolves
  without throwing and without calling `convertKey`, `revertKey`, or
  `console.log`.

Coverage tooling (`npm run test:coverage`) MUST run against `src/**/*.ts`
excluding `src/index.ts`, using v8 provider with text+html reporters.

## 10. Known Inconsistencies (preserve-and-flag, don't silently "fix")

- `cli/widevine.ts`'s `'Formating for human ...'` log message contains a
  typo (missing second "t" in "Formatting"). Treat this as part of the
  current observable behavior/tests, not a bug to silently correct, unless
  explicitly asked to change CLI output.

## 11. Regeneration Playbook

To rebuild this package from nothing using only this spec, implement and
verify in this order (each step's tests should pass before moving on):

1. Scaffold `package.json` per §4, `tsconfig.json`/`tsconfig.build.json`
   per §8, `vitest.config.ts` per §8, `.nvmrc`/`.tool-versions` pinning
   Node `24.20.0`, `.gitignore` (standard Node ignores + `dist/`,
   `coverage/`).
2. Implement `src/lib/utilities.ts` (§6.1) + `test/utilities.test.ts`
   (§9) — no external deps.
3. Implement `src/lib/encryption.ts` (§6.2) + `test/encryption.test.ts`
   (§9) — depends only on `node:crypto`.
4. Implement `src/lib/playready.ts` (§6.3) + `test/playready.test.ts`
   (§9) — depends on step 2's `swapEndian`.
5. Implement `src/lib/widevine.ts` (§6.4) + `test/widevine.test.ts`
   (§9) — depends on steps 2 and 3; add `axios` dependency.
6. Implement `src/cli/widevine.ts` (§6.5) + `test/cli-widevine.test.ts`
   (§9) — depends on step 5; add `commander` dependency.
7. Implement `src/cli/playready.ts` (§6.6) + `test/cli-playready.test.ts`
   (§9) — depends on step 4; add no new dependencies (reuses `commander`).
8. Implement `src/index.ts` (§6.7), registering both the widevine and
   playready sub-commands — depends on steps 6 and 7.
9. Verify `npm run typecheck`, `npm test`, `npm run build`, then manually
   smoke-test the built CLI (`node dist/index.js`, `... widevine`,
   `... widevine key --help`, `... playready`, `... playready convert --key <hex>`)
   against §7's exact help/usage text.
10. Write/update `README.md` to match §7 (installation + usage section
    for both `widevine` and `playready`) and a short "Development" section
    listing the scripts from §4.
