/**
 * npm-published - Determine when modules on a project were published
 *
 * Why? useful for quickly determining what has recently changed to track down errors
 *
 * Author: Branden Horiuchi <bhoriuchi@gmail.com>
 */
var _ = require('lodash')
var path = require('path')
var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var npm = require('npm')
var walk = require('walk-promise')

//  constants
const oneDay = 86400000 // 24*60*60*1000

//  get a timestamp
function now () {
  return (new Date()).toISOString()
}

//  calculate days ago
function daysAgo (published) {
  return Math.round(Math.abs(((new Date()).getTime() - published.getTime())/(oneDay)));
}

//  convert from into a date object, default to the epoch
function getDate (from, log) {
  try {
    from = new Date(from)
  } catch (err) {
    from = new Date(0)
  }
  return from
}

//  resolve the source path
function resolveSource (source, log) {
  if (source.match('^package.json$|^node_modules$')) {
    source = path.resolve(__dirname, '../'.concat(source))
  } else if (source.match(/.+\/package.json$|.+\/node_modules$/)) {
    source = path.resolve(source)
  }
  return source
}

//  file exists helper
function fileExists (file, log) {
  try {
    fs.statSync(file)
    return true
  } catch (err) {
    log({ level: 'error', message: 'The source ' + file + ' could not be found', time: now() })
    return false
  }
}

//  get dependencies based on options specified
function getPackage (source, options) {
  var pkg = require(source)
  var deps = options.deps
  d = {}
  if (options._isPackageQuery) {
    if ((!deps || deps === 'all' || deps === 'prod') && pkg.dependencies) {
      _.merge(d, pkg.dependencies)
    }
    if ((!deps || deps === 'all' || deps === 'dev') && pkg.devDependencies) {
      _.merge(d, pkg.devDependencies)
    }
  } else {
    d[pkg.name] = pkg.version
  }
  return {
    name: pkg.name,
    version: pkg.version,
    deps: d
  }
}

//  get versions and published dates for each module in the package
function getVersions (source, options, pkgs, log) {
  var package = getPackage(source, options)
  var srcPkg = [package.name, package.version].join('@')
  pkgs = pkgs || {}

  return new promise (function (resolve, reject) {
    npm.load({ loglevel: 'silent' }, function (err) {
      if (err) return reject({
        level: 'error',
        message: 'npm load failed',
        time: now()
      })
      return promise.each(_.keys(package.deps), function (name) {
        var version = package.deps[name]
        return new promise(function (resolve, reject) {
          var search = [name, version].join('@')
          npm.commands.view([search], true, function (err, data) {
            if (err) {
              if (err.statusCode === 404) {
                log({
                  level: 'error',
                  message: [search, ' could not be found in the npm registry'].join(''),
                  time: now()
                })
                return resolve(pkgs)
              }
              return reject({
                level: 'error',
                message: ['npm view failed for ', search].join(''),
                time: now()
              })
            }
            var v = _.last(_.keys(data))
            var info = data[v]
            var published = new Date(info.time[v])
            var vstr = [name, v].join('@')
            if (_.has(pkgs, vstr)) pkgs[vstr].dependents = _.union(pkgs[vstr].dependents, [srcPkg])
            else pkgs[vstr] = { published: published, depdendents: [srcPkg] }
            return resolve(pkgs)
          })
        })
      }).then(function () {
        return resolve(pkgs)
      })
    })
  }).then(function () {
    return pkgs
  }).caught(function (err) {
    log({ level: 'error', message: 'npm load failed ', time: now() })
  })
}

function query (source, from, to, options) {
  var log = (typeof this.log === 'function') ? this.log : function () {}
  options = options || {}
  options._isPackageQuery = source.match(/package.json$/)
  from = getDate(from, log)
  to = getDate(to || now(), log)
  source = resolveSource(source, log)
  if (!fileExists(source, log)) return Promise.reject(new Error('Source does not exist: ' + source))
  return getVersions(source, options, undefined, log).then(function (pkgs) {
    return _.omitBy(pkgs, function (pkg) {
      return pkg.published < from || pkg.published > to
    })
  }).then(function (pkgs) {
    if (options.showDays) {
      _.forEach(pkgs, function (p) {
        var ago = daysAgo(p.published)
        var txt = ago === 1 ? 'day ago' : 'days ago'
        p.published = [ago, txt].join(' ')
      })
    }
    return pkgs
  })
}

function getVersions (files, pathName) {
  var j = {}
  return promise.each(files, function (file) {
    if (file.name === 'package.json') {
      var pathStr = path.resolve(file.root, file.name)
      var rx = new RegExp('^' + pathName)
      var relPath = pathStr.replace(rx, '')
      return fs.readFileAsync(pathStr).then(function (content) {
        try {
          var package = JSON.parse(content)
          _.set(j, '["' + package.name + '"]["' + package.version + '"]["' + relPath + '"]', true)
        } catch (err) {
          console.error('got error on', pathStr)
        }
      })
    }
  }).then(function () {
    return j
  })
}

function diff (a, b) {
  var aPath = resolveSource(a)
  var bPath = resolveSource(b)
  var aMissing = []
  var bMissing = []

  return walk(aPath).then(function (aFiles) {
    return walk(bPath).then(function (bFiles) {
      return getVersions(aFiles, aPath).then(function (aVersions) {
        return getVersions(bFiles, bPath).then(function (bVersions) {
          // get b missing
          _.forEach(aVersions, function (versions, name) {
            _.forEach(versions, function (paths, version) {
              if (!_.has(bVersions, '["' + name + '"]["' + version + '"]')) {
                bMissing.push({
                  name: name,
                  version: version
                })
              }
            })
          })
          // get a missing
          _.forEach(bVersions, function (versions, name) {
            _.forEach(versions, function (paths, version) {
              if (!_.has(aVersions, '["' + name + '"]["' + version + '"]')) {
                aMissing.push({
                  name: name,
                  version: version
                })
              }
            })
          })

          console.log('Missing from Source')
          console.log(JSON.stringify(aMissing, null, '  '))
          console.log('----------------------------------')
          console.log('Missing from Diff')
          console.log(JSON.stringify(bMissing, null, '  '))
        })
      })
    })
  })
}



module.exports = {
  log: function (obj) { console.log(obj) },
  query: query,
  diff: diff
}
