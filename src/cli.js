/**
 * npm-published - Determine when modules on a project were published
 * Author: Branden Horiuchi <bhoriuchi@gmail.com>
 * Command line utility
 */
import { diff as getDiff, query } from './index'

let opt = require('node-getopt').create([
  ['s', 'source=ARG', 'package source (package.json or /node_modules)'],
  ['f', 'from=ARG', 'filter out packages older than a specific date, optional'],
  ['t', 'to=ARG', 'filter out packages newer than a specific date, optional'],
  ['d', 'deps=ARG', 'dependencies to check, options are dev, prod, and all. all is default'],
  ['', 'diff=ARG', ''],
  ['', 'days', 'display how many days ago each module was published instead of the publish date']
])
  .bindHelp()
  .parseSystem()

let { source, deps, from, to, showDays, diff } = opt.options

if (source && diff) {
  getDiff(source, diff)
} else {
  query(source, from, to, { deps: deps, showDays: showDays })
    .then((pkgs) => console.log(JSON.stringify(pkgs, null, '  ')))
}