import _ from 'lodash'
import Promise from 'bluebird'
import getVersions from './getVersions'
import { getDate, resolveSource, fileExists, now, daysAgo } from './common'

export default function query (source, from, to, options = {}) {
  let log = _.isFunction(this.log) ? this.log : () => true
  options._isPackageQuery = source.match(/package.json$/)
  from = getDate(from, log)
  to = getDate(to || now(), log)
  source = resolveSource(source, log)

  if (!fileExists(source, log)) return Promise.reject(new Error(`Source does not exist: ${source}`))
  return getVersions(source, options, undefined, log)
    .then((pkgs) => _.omitBy(pkgs, (pkg) => (pkg.published < from || pkg.published > to)))
    .then((pkgs) => {
      if (options.showDays) {
        _.forEach(pkgs, (p) => {
          let ago = daysAgo(p.published)
          let txt = ago === 1 ? 'day ago' : 'days ago'
          p.published = `${ago} ${txt}`
        })
      }
      return pkgs
    })
}