# drm-tools
Tools for Widevine and PlayReady

## Installation

```bash
$ npm i -g drm-tools
```

## Usage

```bash
$ drmtools
Usage: drmtools <command> -h for help

Widevine DRM Command Line Tools

Options:
  -v, --version                   output the version number
  -h, --help                      output usage information

Commands:
  widevine [options] [operation]
```

```bash
$ drmtools widevine
Usage: widevine [operation] [options]

Operations:
 - key : Tools to get Widevine content key
 - pssh: Tools to work with Widevine PSSH

Options:
  --content-id [id]      Content ID
  --url [url]            Target key server URL
  --provider [provider]  Provider (for Widevine)
  --key [key]            Private Key
  --key-iv [kiv]         Private Key IV
  --track [value]        DRM Track Type (default: "ALL")
  --human                Print result in human readable format
  -h, --help             output usage information
```
