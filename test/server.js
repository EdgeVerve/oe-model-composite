/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var oecloud = require('oe-cloud');

oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
});

