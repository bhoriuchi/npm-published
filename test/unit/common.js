var common = published.common

describe('Common', function () {
  it('Should calculate days ago', function (done) {
    expect(common.daysAgo(new Date(Date.now() - common.oneDay))).to.equal(1)
    done()
  })

  it('Should resolve source path', function (done) {
    var res = common.resolveSource('package.json')
    expect(res).to.equal(common.baseDir + '/package.json')
    done()
  })

  it('Should verify that a file exists', function (done) {
    expect(common.fileExists(common.baseDir + '/package.json')).to.equal(true)
    expect(common.fileExists(common.baseDir + '/package.jsonABC')).to.equal(false)
    done()
  })
})