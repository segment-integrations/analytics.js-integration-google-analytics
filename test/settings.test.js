'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var integration = require('@segment/analytics.js-integration');
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var plugin = require('../lib/');

describe('Google Analytics', function() {
  var GA = plugin.Integration;
  var analytics;

  beforeEach(function() {
    analytics = new Analytics();
    analytics.use(plugin);
    analytics.use(tester);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    sandbox();
  });

  it('should have the right settings', function() {
    analytics.compare(GA, integration('Google Analytics')
      .readyOnLoad()
      .global('ga')
      .global('gaplugins')
      .global('_gaq')
      .global('GoogleAnalyticsObject')
      .option('anonymizeIp', false)
      .option('classic', false)
      .option('contentGroupings', {})
      .option('dimensions', {})
      .option('domain', 'auto')
      .option('doubleClick', false)
      .option('enhancedEcommerce', false)
      .option('enhancedLinkAttribution', false)
      .option('ignoredReferrers', null)
      .option('includeSearch', false)
      .option('setAllMappedProps', true)
      .option('metrics', {})
      .option('nonInteraction', false)
      .option('sendUserId', false)
      .option('siteSpeedSampleRate', 1)
      .option('trackCategorizedPages', true)
      .option('trackNamedPages', true)
      .option('trackingId', '')
      .option('optimize', '')
      .option('nameTracker', false)
      .option('sampleRate', 100));
  });
});
