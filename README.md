## Compare runs

This code is experimental. Use at your own risk

It assumes you have wpt on `../wpt`.

## wpt run

```
❯ node wpt-run.js --help                                                   
wpt-run [args] [...files]

Options:
      --version   Show version number                                  [boolean]
  -p, --wpt-path  the path location of wpt          [string] [default: "../wpt"]
  -l, --log       the log file to be saved                              [string]
  -b, --browser   browser to run tests              [string] [default: "chrome"]
  -i, --include   file to include to wpt                                [string]
      --help      Show help                                            [boolean]
```

### Examples:

```bash
node wpt-run.js -i includes/error.js content-security-policy/nonce-hiding
```

## wpt compare logs (index.js)

```
❯ node index.js --help                                                             
wpt-compare <file-a> <file-b> [args]

Options:
      --version   Show version number                                  [boolean]
  -p, --wpt-path  the path location of wpt               [string] [default: "."]
      --help      Show help                                            [boolean]
```

```dotnetcli
node index.js logs/file-a.json logs/file-b.json
```
