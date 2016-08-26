'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var path = _interopDefault(require('path'));
var File = _interopDefault(require('fs'));
var Promise$1 = _interopDefault(require('bluebird'));
var walk = _interopDefault(require('walk-promise'));
var npm = _interopDefault(require('npm'));

function log(obj) {
  console.log(obj);
}

var baseDir = __dirname.replace(/(.*\/npm-published).*/, '$1');
var oneDay = 86400000; // 24*60*60*1000

//  get a timestamp
function now() {
  return new Date().toISOString();
}

//  calculate days ago
function daysAgo(published) {
  return Math.round(Math.abs((new Date().getTime() - published.getTime()) / oneDay));
}

//  convert from into a date object, default to the epoch
function getDate(from) {
  try {
    from = new Date(from);
  } catch (err) {
    from = new Date(0);
  }
  return from;
}

//  resolve the source path
function resolveSource(source) {
  if (source.match('^package.json$|^node_modules$')) {
    source = path.resolve(baseDir, './' + source);
  } else if (source.match(/.+\/package.json$|.+\/node_modules$/)) {
    source = path.resolve(source);
  }
  return source;
}

//  file exists helper
function fileExists(file) {
  var log = arguments.length <= 1 || arguments[1] === undefined ? function () {
    return false;
  } : arguments[1];

  try {
    File.statSync(file);
    return true;
  } catch (err) {
    log({ level: 'error', message: 'The source ' + file + ' could not be found', time: now() });
    return false;
  }
}

var common = {
  baseDir: baseDir,
  oneDay: oneDay,
  now: now,
  daysAgo: daysAgo,
  getDate: getDate,
  resolveSource: resolveSource,
  fileExists: fileExists
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

var fs = Promise$1.promisifyAll(File);

function getDiffVersions(files, pathName) {
  var j = {};
  return Promise$1.each(files, function (file) {
    if (file.name === 'package.json') {
      var _ret = function () {
        var pathStr = path.resolve(file.root, file.name);
        var rx = new RegExp('^' + pathName);
        var relPath = pathStr.replace(rx, '');
        return {
          v: fs.readFileAsync(pathStr).then(function (content) {
            try {
              var p = JSON.parse(content);
              _.set(j, '["' + p.name + '"]["' + p.version + '"]["' + relPath + '"]', true);
            } catch (err) {
              console.error('got error on', pathStr);
            }
          })
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }
  }).then(function () {
    return j;
  });
}

function diff(a, b) {
  var aPath = resolveSource(a);
  var bPath = resolveSource(b);
  var aMissing = [];
  var bMissing = [];

  return walk(aPath).then(function (aFiles) {
    return walk(bPath).then(function (bFiles) {
      return getDiffVersions(aFiles, aPath).then(function (aVersions) {
        return getDiffVersions(bFiles, bPath).then(function (bVersions) {
          // get b missing
          _.forEach(aVersions, function (versions, name) {
            _.forEach(versions, function (paths, version) {
              if (!_.has(bVersions, '["' + name + '"]["' + version + '"]')) {
                bMissing.push({
                  name: name,
                  version: version
                });
              }
            });
          });
          // get a missing
          _.forEach(bVersions, function (versions, name) {
            _.forEach(versions, function (paths, version) {
              if (!_.has(aVersions, '["' + name + '"]["' + version + '"]')) {
                aMissing.push({
                  name: name,
                  version: version
                });
              }
            });
          });

          console.log('Missing from Source');
          console.log(JSON.stringify(aMissing, null, '  '));
          console.log('----------------------------------');
          console.log('Missing from Diff');
          console.log(JSON.stringify(bMissing, null, '  '));
        });
      });
    });
  });
}

//  get dependencies based on options specified
function getPackage(source, options) {
  var pkg = require(source);
  var deps = options.deps;
  d = {};
  if (options._isPackageQuery) {
    if ((!deps || deps === 'all' || deps === 'prod') && pkg.dependencies) {
      _.merge(d, pkg.dependencies);
    }
    if ((!deps || deps === 'all' || deps === 'dev') && pkg.devDependencies) {
      _.merge(d, pkg.devDependencies);
    }
  } else {
    d[pkg.name] = pkg.version;
  }
  return {
    name: pkg.name,
    version: pkg.version,
    deps: d
  };
}

function VIEW_FAILED(error, search) {
  return {
    level: 'error',
    message: 'npm view failed for ' + search,
    time: now(),
    error: error
  };
}

function LOAD_FAILED(error) {
  return {
    level: 'error',
    message: 'npm load failed',
    time: now(),
    error: error
  };
}

function getView(pkg, name, pkgs, srcPkg) {
  var version = pkg.deps[name];
  var search = name + '@' + version;

  return new Promise$1(function (resolve, reject) {
    npm.commands.view([search], true, function (error, data) {
      if (error) return error.statusCode === 404 ? resolve(pkgs) : reject(VIEW_FAILED(error, search));
      var v = _.last(_.keys(data));
      var info = data[v];
      var published = new Date(info.time[v]);
      var vstr = [name, v].join('@');
      if (_.has(pkgs, vstr)) pkgs[vstr].dependents = _.union(pkgs[vstr].dependents, [srcPkg]);else pkgs[vstr] = { published: published, dependents: [srcPkg] };
      return resolve(pkgs);
    });
  });
}

//  get versions and published dates for each module in the package
function getVersions(source, options, pkgs, log) {
  var pkg = getPackage(source, options);
  var srcPkg = pkg.name + '@' + pkg.version;
  pkgs = pkgs || {};

  return new Promise$1(function (resolve, reject) {
    npm.load({ loglevel: 'silent' }, function (error) {
      if (error) return reject(LOAD_FAILED(error));
      return Promise$1.each(_.keys(pkg.deps), function (name) {
        return getView(pkg, name, pkgs, srcPkg);
      }).then(function () {
        return resolve(pkgs);
      }).catch(function (error) {
        return reject(error);
      });
    });
  });
}

function query(source, from, to) {
  var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

  var log = _.isFunction(this.log) ? this.log : function () {
    return true;
  };
  options._isPackageQuery = source.match(/package.json$/);
  from = getDate(from, log);
  to = getDate(to || now(), log);
  source = resolveSource(source, log);

  if (!fileExists(source, log)) return Promise$1.reject(new Error('Source does not exist: ' + source));
  return getVersions(source, options, undefined, log).then(function (pkgs) {
    return _.omitBy(pkgs, function (pkg) {
      return pkg.published < from || pkg.published > to;
    });
  }).then(function (pkgs) {
    if (options.showDays) {
      _.forEach(pkgs, function (p) {
        var ago = daysAgo(p.published);
        var txt = ago === 1 ? 'day ago' : 'days ago';
        p.published = ago + ' ' + txt;
      });
    }
    return pkgs;
  });
}

var index = {
  log: log,
  diff: diff,
  query: query,
  common: common
};

exports.log = log;
exports.diff = diff;
exports.query = query;
exports.common = common;
exports['default'] = index;