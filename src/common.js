import path from 'path'
import fs from 'fs'

export const baseDir = __dirname.replace(/(.*\/npm-published).*/, '$1')
export const oneDay = 86400000 // 24*60*60*1000

//  get a timestamp
export function now () {
  return (new Date()).toISOString()
}

//  calculate days ago
export function daysAgo (published) {
  return Math.round(Math.abs(((new Date()).getTime() - published.getTime())/(oneDay)));
}

//  convert from into a date object, default to the epoch
export function getDate (from) {
  try {
    from = new Date(from)
  } catch (err) {
    from = new Date(0)
  }
  return from
}

//  resolve the source path
export function resolveSource (source) {
  if (source.match('^package.json$|^node_modules$')) {
    source = path.resolve(baseDir, `./${source}`)
  } else if (source.match(/.+\/package.json$|.+\/node_modules$/)) {
    source = path.resolve(source)
  }
  return source
}

//  file exists helper
export function fileExists (file, log = () => false) {
  try {
    fs.statSync(file)
    return true
  } catch (err) {
    log({ level: 'error', message: 'The source ' + file + ' could not be found', time: now() })
    return false
  }
}

export default {
  baseDir,
  oneDay,
  now,
  daysAgo,
  getDate,
  resolveSource,
  fileExists
}