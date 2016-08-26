import _ from 'lodash'
import path from 'path'
import File from 'fs'
import Promise from 'bluebird'
import walk from 'walk-promise'
import { resolveSource } from './common'

let fs = Promise.promisifyAll(File)

export function getDiffVersions (files, pathName) {
  var j = {}
  return Promise.each(files, (file) => {
    if (file.name === 'package.json') {
      let pathStr = path.resolve(file.root, file.name)
      let rx = new RegExp('^' + pathName)
      let relPath = pathStr.replace(rx, '')
      return fs.readFileAsync(pathStr).then((content) => {
        try {
          let p = JSON.parse(content)
          _.set(j, `["${p.name}"]["${p.version}"]["${relPath}"]`, true)
        } catch (err) {
          console.error('got error on', pathStr)
        }
      })
    }
  }).then(() => j)
}

export default function diff (a, b) {
  var aPath = resolveSource(a)
  var bPath = resolveSource(b)
  var aMissing = []
  var bMissing = []

  return walk(aPath).then((aFiles) => {
    return walk(bPath).then((bFiles) => {
      return getDiffVersions(aFiles, aPath).then((aVersions) => {
        return getDiffVersions(bFiles, bPath).then((bVersions) => {
          // get b missing
          _.forEach(aVersions, (versions, name) => {
            _.forEach(versions, (paths, version) => {
              if (!_.has(bVersions, '["' + name + '"]["' + version + '"]')) {
                bMissing.push({
                  name: name,
                  version: version
                })
              }
            })
          })
          // get a missing
          _.forEach(bVersions, (versions, name) => {
            _.forEach(versions, (paths, version) => {
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