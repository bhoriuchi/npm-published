# npm-published

---

Determine when node modules in your project have been updated

**still developing**

#### CLI

`node bin/npm-published.js --source </path/to/package.json> --from <published> --days`

**options**

```
--source, -s : source path to package.json
--from, -f   : filter packages published before date. optional, defaults to epoch
--to, -t     : filter packages published after date. optional, defaults to now
--deps, -d   : show prod, dev, or both dependencies. defaults to both,
               valid options are prod, dev, all
--days       : show how many days ago from today the package was published
```

### API

### `.query(source, [from=epoch], [to=now], [options])`
Query the NPM registry for publish timespamps

**Parameters**
* **`source`** `{String}` - path to the `package.json` file to examine
* **`[from=epoch]`** `{String | Date}` - modules published before this date are filtered out
* **`[to=now]`** `{String | Date}` - modules published after this date are filtered out
* **`[options]`** `Object` - hash of options
  * **`deps`** `{String}` - dependencies to examine, valid values are `prod`, `dev`, and `all`
  * **`showDays`** `{Boolean}` - show the published date as days ago from today

**Returns** `{Promise}` - Resolves results object

### `.log`
Settable property for custom logging function

**Example**
```
var published = require('npm-published')

// custom log function
published.log = function (obj) {
    if (obj.level === 'error') console.log('ERROR:', obj.time, obj.message)
}

// npm query
published.query('/projects/example/package.json', '2016-01-01', undefined, {
    deps: 'prod',
    showDays: true
}).then(function (results) {
    // do something with results
})
```

## TODO:
* add recursive dependency support to determine what dependencies have been updated
* add node_modules support to determine what currently installed node_modules have recently changed
* add more output options
* add input options for days ago i.e. -from 2daysago