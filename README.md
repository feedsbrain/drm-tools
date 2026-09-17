# drm-tools

A Node.js command-line toolkit for working with DRM (Digital Rights
Management) systems. It currently supports:

- **Widevine** — request content keys from a Widevine license/key server
  using the signed key-request protocol (SHA1 digest + AES-256-CBC
  signature), and print the decoded response.
- **PlayReady** — convert a key id between its plain hex representation and
  the base64, endian-swapped ("mixed-endian GUID") form PlayReady tooling
  expects, and back again.

It ships as a single global CLI, `drmtools`.

## Requirements

- Node.js **>= 22.12** (developed and tested on Node 24).

## Installation

```bash
$ npm i -g drm-tools
```

Or run it without installing globally:

```bash
$ npx drm-tools <command> ...
```

## Usage

```bash
$ drmtools
Usage: drmtools <command> -h for help

Widevine DRM Command Line Tools

Options:
  -v, --version                    output the version number
  -h, --help                       display help for command

Commands:
  widevine [options] [operation]   Tools to get Widevine content key
  playready [options] [operation]  Tools to convert PlayReady key ids
  help [command]                   display help for command
```

### Widevine

Requests content keys from a Widevine key server. This performs the
provider-signed key-request flow: the request body is JSON-encoded,
base64-wrapped, SHA1-hashed, and the digest is AES-256-CBC encrypted with
your provider's private key/IV to produce the request signature — the same
scheme Widevine license/key servers expect from a provider client.

```bash
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

`--content-id`, `--url`, `--provider`, `--key`, and `--key-iv` are required
for the `key` operation; `--key`/`--key-iv` are your provider's hex-encoded
AES-256 private key and IV. Omitting any of them prints usage instead of
making a request.

```bash
$ drmtools widevine key \
    --content-id my-movie-42 \
    --url https://license.example.com/getcontentkey \
    --provider my-provider \
    --key <hex-private-key> \
    --key-iv <hex-private-key-iv>
```

By default, keys for all tracks (`SD`, `HD`, `AUDIO`) are requested. Use
`--track` to request a single track type instead:

```bash
$ drmtools widevine key ... --track hd
```

The raw server response is printed as JSON, with `key_id`/`key` fields
base64-encoded (as returned by the server):

```json
{
  "tracks": [
    { "type": "SD", "key_id": "mo7...==", "key": "9fQ...==" }
  ]
}
```

Pass `--human` to decode those fields to hex instead, which is usually
easier to paste into other tooling (packagers, players, etc.):

```bash
$ drmtools widevine key ... --human
```

```json
{
  "tracks": [
    { "type": "SD", "key_id": "9a8eb...", "key": "f31c0..." }
  ]
}
```

If the request to the key server fails (network error, non-2xx, etc.), the
error is logged and the process exits with code `1`.

> Treat your provider's private key/IV as a secret — never commit them or
> pass them via shell history on a shared machine. Prefer sourcing them
> from environment variables or a secrets manager in scripts.

### PlayReady

Converts a PlayReady key id between plain hex and the base64,
endian-swapped form used by PlayReady tooling. PlayReady key ids are
[GUIDs](https://learn.microsoft.com/en-us/windows/win32/api/guiddef/ns-guiddef-guid),
whose first three fields are stored little-endian while the rest is
big-endian — `convert`/`revert` handle that byte swap for you.

```bash
$ drmtools playready
Usage: drmtools playready [operation] [options]

Operations:
 - convert : Convert a hex key id to its base64 (endian-swapped) form
 - revert  : Convert a base64 (endian-swapped) key id back to hex

Options:
  --key <value>  Key ID to convert or revert
  -h, --help     display help for command
```

```bash
$ drmtools playready convert --key 10000000000000000000000000000000
AAAAEAAAAAAAAAAAAAAAAA==

$ drmtools playready revert --key AAAAEAAAAAAAAAAAAAAAAA==
10000000000000000000000000000000
```

`convert` and `revert` are exact inverses of each other.

## Development

This project is written in TypeScript (ESM). Sources live in `src/`, unit
tests (Vitest) in `test/`, and `npm run build` compiles to `dist/`. See
[`SPEC.md`](SPEC.md) for a detailed technical specification of every module
and CLI behavior, including test vectors.

```bash
$ npm install        # install dependencies
$ npm run build      # compile src/ -> dist/
$ npm test           # run the unit tests
$ npm run test:watch # re-run tests on file changes
$ npm run test:coverage
$ npm run typecheck  # type-check sources and tests without emitting
$ npm run clean      # remove dist/ and coverage/
```

Project layout:

```
src/
  index.ts        CLI entrypoint (commander program, registers sub-commands)
  cli/
    widevine.ts    `widevine` sub-command
    playready.ts   `playready` sub-command
  lib/
    widevine.ts    getKeys(): signed key-server request/response
    playready.ts   convertKey()/revertKey(): key-id conversion
    encryption.ts  SHA1 digest + AES encrypt/decrypt helper
    utilities.ts   swapEndian(), wrapPromise()
test/              Vitest unit + CLI tests (one file per src module)
```

## License

[ISC](LICENSE)
