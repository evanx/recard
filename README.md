# recard

Scan Redis sets and print cardinality.

<img src='https://raw.githubusercontent.com/evanx/recard/master/docs/readme/images/main3.png'>


## Installation

Node v7 is required for `async` functions which we `await`

Note that early v7 versions require `--harmony` which is default from v7.6

We suggest that you create a custom `recard` script in your `PATH` to run `lib/index.js` via Node v7 e.g.
```
/usr/local/n/versions/node/7.7.4/bin/node $HOME/recard/lib/index.js
```
where
- the latest `node` version is installed e.g. via `n latest`
- and `recard` is installed in your `$HOME` as follows
```
cd
git clone https://github.com/evanx/recard.git
cd recard
npm install
```

Alternatively `alias` into your shell e.g. via your `.bashrc`
```
alias recard='mode=quiet /usr/local/n/versions/node/7.7.4/bin/node --harmony ~/recard/lib/index.js'
```

## Usage

Parameters are passed via environment variables.

We always specify a `pattern` for the Redis `SCAN`
```
pattern=* recard
```

We can specify an `command` e.g. `del` to delete all keys matching the pattern:
```
pattern=tmp:* command=del recard
```

The following commands are supported:
- `del`
- `expire` - requires `ttl` parameter
- `hget` - requires `field` parameter
- `hgetall`
- `hkeys`
- `llen`
- `persist`
- `ttl`
- `type`

In the case of `expire` we specify a TTL in seconds e.g. set to expire in an hour:
```
pattern=tmp:* command=expire ttl=3600 recard
```

We can inspect types via Redis `TYPE` command for each scanned key:
```
pattern=* command=type recard
```

We can inspect TTL via Redis `TTL` command for each scanned key:
```
pattern=* command=ttl recard | sort -nr
```
Note that we print the TTL and then the key, to facilitate piping to `sort -nr` as above.

Incidently, we can filter the `min` and `max` e.g. to find all keys expiring in the next hour:
```
limit=0 min=0 max=3600 pattern=* command=ttl recard
```

## Config

See `lib/spec.js` https://github.com/evanx/recard/blob/master/lib/spec.js
```javascript
pattern: {
    description: 'the matching pattern for Redis scan',
    example: '*'
},
field: {
    description: 'the field name for hashes',
    requiredEnv: env => ['hget'].includes(env.command)
},
command: {
    description: 'the command to perform',
    options: ['del', 'hkeys', 'hgetall', 'llen', 'hget', 'ttl', 'type', 'expire', 'persist'],
    default: 'none'
},
ttl: {
    description: 'the TTL for expire command',
    unit: 's',
    requiredEnv: env => ['expire'].includes(env.command)        
},
min: {
    description: 'the minimum value to filter keys e.g. TTL',
    type: 'integer',
    required: false
},
max: {
    description: 'the maximum value to filter keys e.g. TTL',
    type: 'integer',
    required: false
},
limit: {
    description: 'the maximum number of keys to print',
    note: 'zero means unlimited',
    default: 30
},
filter: {
    description: 'RegExp to filter field values',
    required: false
},
format: {
    description: 'the format to print the key and optional details',
    required: false,
    options: ['verbose', 'terse', 'key', 'value', 'both'],
    default: 'verbose',
},
port: {
    description: 'the Redis host port',
    default: 6379
},
host: {
    description: 'the Redis host address',
    default: 'localhost'
},
```
where the default Redis `host` is `localhost`

## Implementation

See `lib/main.js` https://github.com/evanx/recard/blob/master/lib/main.js
```javascript
let command = getCommand(config);
const type = config.type || getTypeCommand(command);
while (true) {
    const [result] = await multiExecAsync(client, multi => {
        multi.scan(cursor || 0, 'match', config.pattern);
    });
    cursor = parseInt(result[0]);
    const scannedKeys = result[1];
    scanCount += scannedKeys.length;
    const keys = await filterKeysType(scannedKeys, type);
    count += keys.length;
    if (config.field) {
        const results = await multiExecAsync(client, multi => {
            keys.forEach(key => multi.hget(key, config.field));
        });
        keys.forEach((key, index) => {
            const hvalue = results[index];
            if (hvalue !== null) {
                console.log([clc.cyan(key), hvalue].join(' '));
            }
        });
    } else if (command === 'del') {
        const results = await multiExecAsync(client, multi => {
            keys.forEach(key => {
                console.log(clc.blue(key));
                multi.del(key);
            });
        });
        }
    } ...
```

### Application archetype

Uses application archetype: https://github.com/evanx/redis-app

See `lib/index.js` https://github.com/evanx/recard/blob/master/lib/index.js
```javascript
require('redis-app')(
    require('../package'),
    require('./spec'),
    async deps => Object.assign(global, deps),
    () => require('./main')
).catch(err => {
    console.error(err);
});
```
where the `config` is extracted from the `spec` defaults and `process.env` overrides. We choose to set `config` et al on `global` before `main` is invoked.


## Development

See `package.json` https://github.com/evanx/recard/blob/master/package.json

For development, you can run as follows:
```
git clone https://github.com/evanx/recard.git
cat package.json
npm install
pattern='*' npm start
```

## Docker

See `Dockerfile` https://github.com/evanx/recard/blob/master/Dockerfile
```
FROM mhart/alpine
ADD package.json .
RUN npm install --silent
ADD lib lib
CMD ["node", "lib/index.js"]
```

We can build as follows:
```shell
docker build -t recard https://github.com/evanx/recard.git
```
where tagged as image `recard`

Then for example, we can run on the host's Redis as follows:
```shell
docker run --network=host -e pattern='*' recard
```
where `--network-host` connects the container to your `localhost` bridge. The default Redis host `localhost` works in that case.

Since the containerized app has access to the host's Redis instance, you should inspect the source.

<hr>

https://twitter.com/@evanxsummers
