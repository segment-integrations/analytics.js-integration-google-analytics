'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var plugin = require('../lib/');

describe('Google Analytics Classic', function() {
  var GA = plugin.Integration;
  var analytics;
  var ga;
  var settings = {
    anonymizeIp: true,
    classic: true,
    domain: 'auto',
    enhancedLinkAttribution: true,
    ignoredReferrers: ['domain.com', 'www.domain.com'],
    siteSpeedSampleRate: 42,
    trackingId: 'UA-27033709-5'
  };

  beforeEach(function() {
    analytics = new Analytics();
    analytics.use(plugin);
    analytics.use(tester);
    ga = new GA(settings);
    analytics.add(ga);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    ga.reset();
    sandbox();
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(ga, 'load');
    });

    describe('#initialize', function() {
      it('should create window._gaq', function() {
        analytics.assert(!window._gaq);
        analytics.initialize();
        analytics.page();
        analytics.assert(window._gaq instanceof Array);
      });

      it('should push the tracking id', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[0], ['_setAccount', settings.trackingId]);
      });

      it('should set allow linker', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[1], ['_setAllowLinker', true]);
      });

      it('should set anonymize ip', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[2], ['_gat._anonymizeIp']);
      });

      it('should set domain name', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[3], ['_setDomainName', settings.domain]);
      });

      it('should set site speed sample rate', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[4], ['_setSiteSpeedSampleRate', settings.siteSpeedSampleRate]);
      });

      it('should set enhanced link attribution', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[5], ['_require', 'inpage_linkid', 'http://www.google-analytics.com/plugins/ga/inpage_linkid.js']);
      });

      it('should set ignored referrers', function() {
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._gaq[6], ['_addIgnoredRef', settings.ignoredReferrers[0]]);
        analytics.deepEqual(window._gaq[7], ['_addIgnoredRef', settings.ignoredReferrers[1]]);
      });
    });
  });

  describe('loading', function() {
    it('should load', function(done) {
      analytics.load(ga, done);
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window._gaq, 'push');
      });

      it('should send a page view', function() {
        analytics.page();
        analytics.called(window._gaq.push, ['_trackPageview', window.location.pathname]);
      });

      it('should send a path', function() {
        analytics.page({ path: '/path' });
        analytics.called(window._gaq.push, ['_trackPageview', '/path']);
      });

      it('should send the query if its included', function() {
        ga.options.includeSearch = true;
        analytics.page({ path: '/path', search: '?q=1' });
        analytics.called(window._gaq.push, ['_trackPageview', '/path?q=1']);
      });

      it('should track a named page', function() {
        analytics.page('Name');
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'Viewed Name Page', undefined, 0, true]);
      });

      it('should track a named page with a category', function() {
        analytics.page('Category', 'Name');
        analytics.called(window._gaq.push, ['_trackEvent', 'Category', 'Viewed Category Name Page', undefined, 0, true]);
      });

      it('should track a categorized page', function() {
        analytics.page('Category', 'Name');
        analytics.called(window._gaq.push, ['_trackEvent', 'Category', 'Viewed Category Page', undefined, 0, true]);
      });

      it('should not track a named or categorized page when the option is off', function() {
        ga.options.trackNamedPages = false;
        ga.options.trackCategorizedPages = false;
        analytics.page('Name');
        analytics.page('Category', 'Name');
        analytics.calledTwice(window._gaq.push);
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window._gaq, 'push');
      });

      it('should send an event', function() {
        analytics.track('event');
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', undefined, 0, false]);
      });

      it('should send a category property', function() {
        analytics.track('event', { category: 'category' });
        analytics.called(window._gaq.push, ['_trackEvent', 'category', 'event', undefined, 0, false]);
      });

      it('should send a stored category', function() {
        analytics.page('category');
        analytics.track('event', { category: 'category' });
        analytics.called(window._gaq.push, ['_trackEvent', 'category', 'event', undefined, 0, false]);
      });

      it('should send a label property', function() {
        analytics.track('event', { label: 'label' });
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', 'label', 0, false]);
      });

      it('should send a rounded value property', function() {
        analytics.track('event', { value: 1.1 });
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', undefined, 1, false]);
      });

      it('should prefer a rounded revenue property', function() {
        analytics.track('event', { revenue: 9.99 });
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', undefined, 10, false]);
      });

      it('should send a non-interaction property', function() {
        analytics.track('event', { nonInteraction: 1 });
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', undefined, 0, true]);
      });

      it('should send a non-interaction option', function() {
        analytics.track('event', {}, { 'Google Analytics': { nonInteraction: 1 } });
        analytics.called(window._gaq.push, ['_trackEvent', 'All', 'event', undefined, 0, true]);
      });
    });

    describe('ecommerce', function() {
      beforeEach(function() {
        analytics.stub(window._gaq, 'push');
      });

      it('should send simple ecommerce data', function() {
        analytics.track('order completed', { orderId: '078781c7' });
        analytics.assert(window._gaq.push.args.length === 3);
        analytics.assert(window._gaq.push.args[0][0][0] === '_addTrans');
        analytics.deepEqual(['_set', 'currencyCode', 'USD'], window._gaq.push.args[1][0]);
        analytics.assert(window._gaq.push.args[2][0][0] === '_trackTrans');
      });

      it('should send ecommerce data', function() {
        analytics.track('order completed', {
          orderId: 'af5ccd73',
          total: 99.99,
          shipping: 13.99,
          tax: 20.99,
          products: [{
            quantity: 1,
            price: 24.75,
            name: 'my product',
            sku: 'p-298'
          }, {
            quantity: 3,
            price: 24.75,
            name: 'other product',
            sku: 'p-299'
          }]
        });

        analytics.deepEqual(window._gaq.push.args[0], [[
          '_addTrans',
          'af5ccd73',
          undefined,
          99.99,
          20.99,
          13.99,
          null,
          null,
          null
        ]]);

        analytics.deepEqual(window._gaq.push.args[1], [[
          '_addItem',
          'af5ccd73',
          'p-298',
          'my product',
          undefined,
          24.75,
          1
        ]]);

        analytics.deepEqual(window._gaq.push.args[2], [[
          '_addItem',
          'af5ccd73',
          'p-299',
          'other product',
          undefined,
          24.75,
          3
        ]]);

        analytics.deepEqual(window._gaq.push.args[3], [[
          '_set',
          'currencyCode',
          'USD'
        ]]);

        analytics.deepEqual(window._gaq.push.args[4], [[
          '_trackTrans'
        ]]);
      });

      it('should fallback to revenue', function() {
        analytics.track('order completed', {
          orderId: 'f2ffee5c',
          revenue: 9,
          shipping: 3,
          tax: 2,
          products: []
        });

        analytics.deepEqual(window._gaq.push.args[0], [[
          '_addTrans',
          'f2ffee5c',
          undefined,
          9,
          2,
          3,
          null,
          null,
          null
        ]]);
      });
    });
  });
});