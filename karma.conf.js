/* eslint-env node */
'use strict';

module.exports = function(config) {
  config.set({
    files: [
      'test/**/*.test.js'
    ],

    browsers: ['PhantomJS'],

    frameworks: ['browserify', 'mocha'],
    // FIXME(peripheral1994): Disabling coverage to debug
    // reporters: ['spec', 'coverage'],

    preprocessors: {
      'test/**/*.js': 'browserify'
    },

    client: {
      mocha: {
        grep: process.env.GREP,
        reporter: 'html',
        timeout: 10000
      }
    },

    browserify: {
      debug: true,
      transform: [
        [
          'browserify-istanbul',
          {
            instrumenterConfig: {
              embedSource: true
            }
          }
        ]
      ]
    }
    // FIXME(peripheral1994): Disabling coverage to debug
    /*
    coverageReporter: {
      reporters: [
        { type: 'text' },
        { type: 'html' },
        { type: 'json' }
      ]
    }
    */
  });
};
