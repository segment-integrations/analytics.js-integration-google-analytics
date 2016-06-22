/* eslint-env node */
'use strict';

var baseConfig = require('./karma.conf');

// FIXME(ndhoule): Tests for non-PhantomJS 2 browsers are disabled due to a race
// condition in the test suite. Google Analytics mutates inputs to `window.ga`
// on a sometimes-synchronous, sometimes-asynchronous basis (varies on both a
// per-run and per-browser basis). Spying on window.ga calls therefore becomes
// very difficult.
//
// Ideally, the test "fixes" in 4b727753fe600a6684be2f868fb63b4f32e2c2f3 should
// not be necessary as we should figure out a better way to test calls, but for
// now this should reasonably ensure that GA continues to work.
var customLaunchers = {
  // sl_chrome_latest: {
  //   base: 'SauceLabs',
  //   browserName: 'chrome',
  //   platform: 'linux',
  //   version: 'latest'
  // },
  // sl_chrome_latest_1: {
  //   base: 'SauceLabs',
  //   browserName: 'chrome',
  //   platform: 'linux',
  //   version: 'latest-1'
  // },
  // sl_firefox_latest: {
  //   base: 'SauceLabs',
  //   browserName: 'firefox',
  //   platform: 'linux',
  //   version: 'latest'
  // },
  // sl_firefox_latest_1: {
  //   base: 'SauceLabs',
  //   browserName: 'firefox',
  //   platform: 'linux',
  //   version: 'latest-1'
  // },
  // sl_safari_9: {
  //   base: 'SauceLabs',
  //   browserName: 'safari',
  //   version: '9.0'
  // },
  // FIXME(ndhoule): Bad IE7/8 support in testing packages make these fail
  // sl_ie_7: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   version: '7'
  // },
  // sl_ie_8: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   version: '8'
  // },
  // sl_ie_9: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   version: '9'
  // },
  // sl_ie_10: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   version: '10'
  // },
  // sl_ie_11: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   version: '11'
  // },
  // sl_edge_latest: {
  //   base: 'SauceLabs',
  //   browserName: 'microsoftedge'
  // }
};

module.exports = function(config) {
  baseConfig(config);

  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    throw new Error('SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are required but are missing');
  }

  config.set({
    browserDisconnectTolerance: 1,

    singleRun: true,

    reporters: ['progress', 'junit', 'coverage'],

    browsers: ['PhantomJS'].concat(Object.keys(customLaunchers)),

    customLaunchers: customLaunchers,

    junitReporter: {
      outputDir: process.env.TEST_REPORTS_DIR,
      suite: require('./package.json').name
    },

    sauceLabs: {
      testName: require('./package.json').name
    },

    coverageReporter: {
      reporters: [
        { type: 'lcov' }
      ]
    }
  });
};
