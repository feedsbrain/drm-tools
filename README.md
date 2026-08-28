# drm-tools
Tools for Widevine and PlayReady

## Installation

```bash
$ npm i -g drm-tools
```

## Usage

### Widevine

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

## Development

This project is written in TypeScript (ESM). Sources live in `src/`, unit tests
(Vitest) in `test/`, and `npm run build` compiles to `dist/`.

```bash
$ npm install        # install dependencies
$ npm run build      # compile src/ -> dist/
$ npm test           # run the unit tests
$ npm run test:coverage
$ npm run typecheck  # type-check sources and tests without emitting
```

Requires Node.js >= 22.12 (developed and tested on Node 24).
