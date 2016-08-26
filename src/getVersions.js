import _ from 'lodash'
import Promise from 'bluebird'
import npm from 'npm'
import getPackage from './getPackage'
import { VIEW_FAILED, LOAD_FAILED } from './errors'

export function getView (pkg, name, pkgs, srcPkg) {
  let version = pkg.deps[name]
  let search = `${name}@${version}`

  return new Promise((resolve, reject) => {
    npm.commands.view([search], true, (error, data) => {
      if (error) return error.statusCode === 404 ? resolve(pkgs) : reject(VIEW_FAILED(error, search))
      let v = _.last(_.keys(data))
      let info = data[v]
      let published = new Date(info.time[v])
      let vstr = [name, v].join('@')
      if (_.has(pkgs, vstr)) pkgs[vstr].dependents = _.union(pkgs[vstr].dependents, [srcPkg])
      else pkgs[vstr] = { published: published, dependents: [srcPkg] }
      return resolve(pkgs)
    })
  })
}

//  get versions and published dates for each module in the package
export default function getVersions (source, options, pkgs, log) {
  let pkg = getPackage(source, options)
  let srcPkg = `${pkg.name}@${pkg.version}`
  pkgs = pkgs || {}

  return new Promise((resolve, reject) => {
    npm.load({ loglevel: 'silent' }, (error) => {
      if (error) return reject(LOAD_FAILED(error))
      return Promise.each(_.keys(pkg.deps), (name) => getView(pkg, name, pkgs, srcPkg))
        .then(() => resolve(pkgs))
        .catch((error) => reject(error))
    })
  })
}