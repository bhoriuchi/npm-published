var chai = global.chai = require('chai')
var expect = global.expect = chai.expect
var published = global.published = require('../index').default

// include tests
var unit = require('./unit')

// run tests
unit()