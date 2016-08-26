import _ from 'lodash'

//  get dependencies based on options specified
export default function getPackage (source, options) {
  let pkg = require(source)
  let deps = options.deps
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