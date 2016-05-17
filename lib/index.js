/**
 * Created by Branden Horiuchi on 5/17/16.
 */
var _ = require('lodash')
var path = require('path')
var fs = require('fs')
var npm = require('npm')
var util = require('util')
var opt = require('node-getopt').create([
    ['s', 'source=ARG', 'package source (package.json or /node_modules)'],
    ['', 'from=ARG', 'filter out packages older than a specific date, optional'],
    ['', 'deps=ARG', 'dependencies to check, options are dev, prod, and all. all is default'],
    ['d', 'days', 'display how many days ago each module was published instead of the publish date']
]).bindHelp().parseSystem()

var oneDay = 24*60*60*1000;
var isPackage = true
var source = opt.options.source
var deps = opt.options.deps
var from = opt.options.from
var showDays = opt.options.days
var d

//  try to create a from date, default to epoch
try {
    from = new Date(from)
} catch (err) {
    from = new Date(0)
}

//  get path
if (source === 'package.json') {
    source = path.resolve(__dirname, '../package.json')
} else if (source === 'node_modules') {
    source = path.resolve(__dirname, '../node_modules')
    isPackage = false
} else if (source.match(/.*\/package.json$/)) {
    source = path.resolve(source)
} else if (source.match(/.*\/node_modules$/)) {
    source = path.resolve(source)
    isPackage = false
}

//  check path
try {
    fs.statSync(source)
} catch (err) {
    console.error('ERROR: The source could not be found')
    return
}

//  handle package.json
if (isPackage) {
    var pkg = require(source)
    d = {}
    if ((!deps || deps === 'all' || deps === 'prod') && pkg.dependencies) {
        _.merge(d, pkg.dependencies)
    }
    if ((!deps || deps === 'all' || deps === 'dev') && pkg.devDependencies) {
        _.merge(d, pkg.devDependencies)
    }
}

//  get version info
npm.load({ loglevel: 'silent' }, function (err) {
    if (err) return
    _.forEach(d, function (version, name) {
        npm.commands.view([[name, version].join('@')], true, function (err, data) {
            if (err) return
            var v = _.last(_.keys(data))
            var info = data[v]
            var published = new Date(info.time[v])
            if (published >= from) {
                var days = Math.round(Math.abs(((new Date()).getTime() - published.getTime())/(oneDay)));
                var summary = showDays ? ['published', days, 'days ago'].join(' ') : ['published on', published].join(' ')
                console.log([name, v].join('@'), summary)
            }
        })
    })
})
