/**
 * npm-published - Determine when modules on a project were published
 * Author: Branden Horiuchi <bhoriuchi@gmail.com>
 * Command line utility
 */
var _ = require('lodash')
var util = require('util')
var published = require('../lib')
var opt = require('node-getopt').create([
    ['s', 'source=ARG', 'package source (package.json or /node_modules)'],
    ['f', 'from=ARG', 'filter out packages older than a specific date, optional'],
    ['t', 'to=ARG', 'filter out packages newer than a specific date, optional'],
    ['d', 'deps=ARG', 'dependencies to check, options are dev, prod, and all. all is default'],
    ['', 'days', 'display how many days ago each module was published instead of the publish date']
]).bindHelp().parseSystem()

//  constants
const oneDay = 86400000 // 24*60*60*1000
var source = opt.options.source
var deps = opt.options.deps
var from = opt.options.from
var to = opt.options.to
var showDays = opt.options.days

var pub = published.query(source, from, to, { deps: deps, showDays: showDays })
if (typeof pub.then === 'function') {
    pub.then(function (pkgs) {
        console.log(JSON.stringify(pkgs, null, '  '))
    })
}