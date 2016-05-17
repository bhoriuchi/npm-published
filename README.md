# npm-published

---

Determine when node modules in your project have been updated

Usage

`node lib/index.js -s </path/to/package.json> -from <published> since; -d`

options

`-s: source path to package.json`

`-from: filter packages published before date. optional, defaults to epoch`

`-d: show how many days ago from today the package was published`

## TODO:
* add recursive dependency support to determine what dependencies have been updated
* add node_modules support to determine what currently installed node_modules have recently changed
* add api support to programatically gather information
* add more output options
* add input options for days ago i.e. -from 2daysago