'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var plugin = require('../lib/');
var sinon = require('sinon');
var metrics = require('../lib/utils').metrics;

describe('Universal', function() {
  var GA = plugin.Integration;
  var analytics;
  var ga;
  var trackerNameSpy;
  var gaStub;
  var settings = {
    anonymizeIp: true,
    domain: '',
    siteSpeedSampleRate: 42,
    sampleRate: 15,
    trackingId: 'UA-27033709-12'
  };

  beforeEach(function() {
    analytics = new Analytics();
    analytics.use(plugin);
    analytics.use(tester);
    ga = new GA(settings);
    analytics.add(ga);
    analytics.initialize();
    trackerNameSpy = sinon.spy(ga, '_getTrackerName');
  });

  afterEach(function() {
    // This test is in place to ensure we are always passing trackerName with any request to the window.ga function.
    // In the beforeEach block we set up a spy on the getTrackerName method in the integration.
    // After all tests, we check to ensure the call count to the window.ga function is equal to the getTrackerName function.
    // There is however one time that you invoke window.ga without a tracker name and that is when you 'create' the actual tracker: window.ga('create', opts.trackingId, config);
    // This is always done first in our .initialize method so we can check the first argument passed to window.ga and if it is `create`, we just compare against all
    // invokations of window.ga -= 1. This allows us to run some tests without needing to call initialize in a beforeEach.
    if (gaStub && gaStub.called) {
      var expectedCalls = gaStub.callCount;
      if (gaStub.args[0][0] === 'create') expectedCalls -= 1;
      analytics.assert(trackerNameSpy.callCount === expectedCalls, 'Tracker Name was not passed in a call to window.ga');
      gaStub.reset();
    }

    window.gaplugins = undefined;
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
      var spy;

      beforeEach(function() {
        analytics.initialize();
        spy = sinon.spy(window, 'ga');
      });

      it('should require \'displayfeatures\' if .doubleClick option is `true`', function() {
        ga.options.doubleClick = true;
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('require', 'displayfeatures'));
      });

      it('should require "linkid.js" if enhanced link attribution is `true`', function() {
        ga.options.enhancedLinkAttribution = true;
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('require', 'linkid', 'linkid.js'));
      });

      it('should create window.GoogleAnalyticsObject', function() {
        ga.reset();
        analytics.assert(!window.GoogleAnalyticsObject);
        analytics.initialize();
        analytics.page();
        analytics.assert(window.GoogleAnalyticsObject === 'ga');
      });

      it('should create window.ga', function() {
        ga.reset();
        analytics.assert(!window.ga);
        analytics.initialize();
        analytics.page();
        analytics.assert(typeof window.ga === 'function');
      });

      it('should create window.ga.l', function() {
        ga.reset();
        analytics.assert(!window.ga);
        analytics.initialize();
        analytics.page();
        analytics.assert(typeof window.ga.l === 'number');
      });

      it('should call window.ga.create with options', function() {
        var expectedOpts = {
          name: '',
          cookieDomain: 'none',
          siteSpeedSampleRate: settings.siteSpeedSampleRate,
          sampleRate: settings.sampleRate,
          allowLinker: true
        };
        // required to pass saucelab tests since those tests are not done in localhost
        if (window.location.hostname !== 'localhost') expectedOpts.cookieDomain = 'auto';
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('create', settings.trackingId, expectedOpts));
      });

      it('should name ga tracker if opted in', function() {
        var expectedOpts = {
          cookieDomain: 'none',
          siteSpeedSampleRate: settings.siteSpeedSampleRate,
          sampleRate: settings.sampleRate,
          allowLinker: true,
          name: 'segmentGATracker'
        };
        ga.options.nameTracker = true;
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('create', settings.trackingId, expectedOpts));
      });

      it('should call window.ga.require for optimize if enabled', function() {
        ga.options.optimize = 'GTM-XXXXX';
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('require', 'GTM-XXXXX'));
      });

      it('should anonymize the ip', function() {
        var expectedOptions = {
          anonymizeIp: true,
          userId: false
        };
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('set', expectedOptions));
      });

      it('should call #load', function() {
        analytics.initialize();
        analytics.page();
        analytics.called(ga.load);
      });

      it('should not send universal user id by default', function() {
        var userId = 'baz';
        var unexpectedOptions = {
          anonymizeIp: true,
          userId: userId
        };
        analytics.user().id(userId);
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.withArgs('set', unexpectedOptions).notCalled);
      });

      it('should send universal user id if sendUserId option is true and user.id() is truthy', function() {
        var userId = 'baz';
        var expectedOptions = {
          anonymizeIp: true,
          userId: userId
        };
        analytics.user().id('baz');
        ga.options.sendUserId = true;
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('set', expectedOptions));
      });

      it('should map custom dimensions & metrics using user.traits()', function() {
        ga.options.metrics = { firstName: 'metric1', last_name: 'metric2', foo: 'metric3' };
        ga.options.dimensions = { Age: 'dimension2', bar: 'dimension3' };
        analytics.user().traits({ firstName: 'John', lastName: 'Doe', age: 20, foo: true, bar: false });
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('set', {
          metric1: 'John',
          metric2: 'Doe',
          metric3: 'true',
          dimension2: 20,
          dimension3: 'false'
        }));
      });

      it('should not set metrics, dimensions and content groupings if there are no traits', function() {
        ga.options.metrics = { metric1: 'something' };
        ga.options.dimensions = { dimension3: 'industry' };
        ga.options.contentGroupings = { contentGrouping1: 'foo' };
        var custom = metrics(analytics.user().traits(), ga.options);
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.withArgs(custom).notCalled);
      });

      it('should set metrics and dimensions that have dots but arent nested', function() {
        ga.options.metrics = { 'name.first': 'metric1', 'name.last': 'metric2' };
        ga.options.dimensions = { Age: 'dimension2' };
        analytics.user().traits({ 'name.first': 'John', 'name.last': 'Doe', age: 20 });
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('set', {
          metric1: 'John',
          metric2: 'Doe',
          dimension2: 20
        }));
      });

      it('should set metrics and dimensions that are nested, using dot notation', function() {
        ga.options.metrics = { 'name.first': 'metric1', 'name.last': 'metric2' };
        ga.options.dimensions = { Age: 'dimension2' };
        analytics.user().traits({
          name: {
            first: 'John',
            last: 'Doe'
          },
          age: 20
        });
        analytics.initialize();
        analytics.page();
        analytics.assert(spy.calledWith('set', {
          metric1: 'John',
          metric2: 'Doe',
          dimension2: 20
        }));
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
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window, 'ga');
      });

      it('should send a page view', function() {
        analytics.page();
        analytics.called(window.ga, 'send', 'pageview', {
          page: window.location.pathname,
          title: document.title,
          location: window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname + window.location.search
        });
      });

      it('should omit location on subsequent page views', function() {
        analytics.page();
        analytics.called(window.ga, 'send', 'pageview', {
          page: window.location.pathname,
          title: document.title,
          location: window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname + window.location.search
        });
        analytics.page();
        analytics.called(window.ga, 'send', 'pageview', {
          page: window.location.pathname,
          title: document.title
        });
      });

      it('should set the tracker\'s page object', function() {
        analytics.page();
        analytics.called(window.ga, 'set', {
          page: window.location.pathname,
          title: document.title
        });
      });

      it('should send a page view with properties', function() {
        analytics.page('category', 'name', { url: 'url', path: '/path' });
        analytics.called(window.ga, 'send', 'pageview', {
          page: '/path',
          title: 'category name',
          location: 'url'
        });
      });

      it('should not set custom dimensions/metrics if settings.setAllMappedProps is false', function() {
        ga.options.setAllMappedProps = false;
        ga.options.metrics = { loadTime: 'metric1', levelAchieved: 'metric2' };
        ga.options.dimensions = { company: 'dimension2' };
        analytics.page('Page Viewed', { loadTime: '100', levelAchieved: '5', company: 'Google' });
        analytics.didNotCall(window.ga, 'set', {
          metric1: '100',
          metric2: '5',
          dimension2: 'Google'
        });
        analytics.called(window.ga, 'send', 'pageview', {
          page: window.location.pathname,
          title: 'Page Viewed',
          location: window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname + window.location.search,
          metric1: '100',
          metric2: '5',
          dimension2: 'Google'
        });
      });

      it('should send the query if its included', function() {
        ga.options.includeSearch = true;
        analytics.page('category', 'name', { url: 'url', path: '/path', search: '?q=1' });
        analytics.called(window.ga, 'send', 'pageview', {
          page: '/path?q=1',
          title: 'category name',
          location: 'url'
        });
      });

      it('should set the campaign info if its included', function() {
        ga.options.includeSearch = true;
        analytics.page('category', 'name', { url: 'url', path: '/path', search: '?q=1' }, {
          campaign: {
            name: 'test',
            source: 'test',
            medium: 'test',
            term: 'test',
            content: 'test'
          }
        });
        analytics.called(window.ga, 'set', {
          campaignName: 'test',
          campaignSource: 'test',
          campaignMedium: 'test',
          campaignKeyword: 'test',
          campaignContent: 'test'
        });
      });

      it('should map and set custom dimensions, metrics & content groupings using page.properties()', function() {
        ga.options.metrics = { score: 'metric1' };
        ga.options.dimensions = { author: 'dimension1', postType: 'dimension2' };
        ga.options.contentGroupings = { section: 'contentGrouping1' };
        analytics.page({ score: 21, author: 'Author', postType: 'blog', section: 'News' });

        analytics.called(window.ga, 'set', {
          metric1: 21,
          dimension1: 'Author',
          dimension2: 'blog',
          contentGrouping1: 'News'
        });
      });

      it('should map custom dimensions, metrics & content groupings even if mapped to the same key', function() {
        ga.options.metrics = { score: 'metric1' };
        ga.options.dimensions = { author: 'dimension1', postType: 'dimension2' };
        ga.options.contentGroupings = { section: 'contentGrouping1', score: 'contentGrouping5' };
        analytics.page({ score: 21, author: 'Author', postType: 'blog', section: 'News' });

        analytics.called(window.ga, 'set', {
          metric1: 21,
          dimension1: 'Author',
          dimension2: 'blog',
          contentGrouping1: 'News',
          contentGrouping5: 21
        });
      });

      it('should track a named page', function() {
        analytics.page('Name');
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'Viewed Name Page',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should track a named page with context', function() {
        analytics.page('Name', {}, {
          campaign: {
            name: 'test',
            source: 'test',
            medium: 'test',
            term: 'test',
            content: 'test'
          }
        });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'Viewed Name Page',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should set campaign params on a track event', function() {
        analytics.page('Name', {}, {
          campaign: {
            name: 'test',
            source: 'test',
            medium: 'test',
            term: 'test',
            content: 'test'
          }
        });
        analytics.called(window.ga, 'set', {
          campaignName: 'test',
          campaignSource: 'test',
          campaignMedium: 'test',
          campaignKeyword: 'test',
          campaignContent: 'test'
        });
      });

      it('should track a name + category page', function() {
        analytics.page('Category', 'Name');
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'Category',
          eventAction: 'Viewed Category Name Page',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should track a categorized page', function() {
        analytics.page('Category', 'Name');
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'Category',
          eventAction: 'Viewed Category Page',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should not track a named or categorized page when the option is off', function() {
        var spy = sinon.spy(ga, 'track');
        ga.options.trackNamedPages = false;
        ga.options.trackCategorizedPages = false;
        analytics.page('Name');
        analytics.page('Category', 'Name');
        analytics.assert(spy.withArgs('Name').notCalled);
        analytics.assert(spy.withArgs('Category').notCalled);
      });

      it('should override referrer when manually set', function() {
        analytics.page({ referrer: 'http://lifeofpablo.com' });
        analytics.called(window.ga, 'set', {
          referrer: 'http://lifeofpablo.com'
        });
      });

      it('should not override referrer if not manually set', function() {
        analytics.page();
        analytics.called(window.ga, 'set', {
          page: window.location.pathname,
          title: document.title
        });
      });
    });

    describe('#identify', function() {
      beforeEach(function() {
        analytics.stub(window, 'ga');
      });

      it('should send user id if sendUserId option is true and identify.user() is truthy', function() {
        ga.options.sendUserId = true;
        analytics.identify('Steven');
        analytics.called(window.ga, 'set', 'userId', 'Steven');
      });

      it('should send not user id if sendUserId option is false and identify.user() is truthy', function() {
        ga.options.sendUserId = false;
        analytics.identify('Steven');
        analytics.assert(window.ga.args.length === 0);
      });

      it('should set custom dimensions', function() {
        ga.options.dimensions = { age: 'dimension1' };
        analytics.identify('Steven', { age: 25 });
        analytics.called(window.ga, 'set', { dimension1: 25 });
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window, 'ga');
      });

      it('should send an event', function() {
        analytics.track('event');
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send an event and map category with a capital C', function() {
        analytics.track('event', { Category: 'blah' });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'blah',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send an event with context', function() {
        analytics.track('event', {}, {
          campaign: {
            name: 'test',
            source: 'test',
            medium: 'test',
            term: 'test',
            content: 'test'
          }
        });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send a category property', function() {
        analytics.track('event', { category: 'category' });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'category',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send a stored category', function() {
        analytics.page('category', 'name');
        analytics.track('event', {});
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'category',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send a category property even if there is a stored category', function() {
        analytics.page('category(page)');
        analytics.track('event', { category: 'category(track)' });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'category(track)',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send a label property', function() {
        analytics.track('event', { label: 'label' });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: 'label',
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should send a rounded value property', function() {
        analytics.track('event', { value: 1.1 });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 1,
          nonInteraction: false
        });
      });

      it('should prefer a rounded revenue property', function() {
        analytics.track('event', { revenue: 9.99 });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 10,
          nonInteraction: false
        });
      });

      it('should send a non-interaction property', function() {
        analytics.track('event', { nonInteraction: 1 });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should send a non-interaction option', function() {
        analytics.track('event', {}, { 'Google Analytics': { nonInteraction: 1 } });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should respect the non-interaction option', function() {
        ga.options.nonInteraction = true;
        analytics.track('event');
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: true
        });
      });

      it('should give precendence to a non-interaction option defined in the event props', function() {
        ga.options.nonInteraction = true;
        analytics.track('event', { nonInteraction: false });
        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'event',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false
        });
      });

      it('should map and set custom dimensions & metrics using track.properties() if setAllMappedProps is true', function() {
        ga.options.setAllMappedProps = true;
        ga.options.metrics = { loadTime: 'metric1', levelAchieved: 'metric2' };
        ga.options.dimensions = { referrer: 'dimension2' };
        analytics.track('Level Unlocked', { loadTime: '100', levelAchieved: '5', referrer: 'Google' });

        analytics.called(window.ga, 'set', {
          metric1: '100',
          metric2: '5',
          dimension2: 'Google'
        });
      });

      it('should send but not set custom dimensions & metrics if setAllMappedProps is false', function() {
        ga.options.setAllMappedProps = false;
        ga.options.metrics = { loadTime: 'metric1', levelAchieved: 'metric2' };
        ga.options.dimensions = { referrer: 'dimension2' };
        analytics.track('Level Unlocked', { loadTime: '100', levelAchieved: '5', referrer: 'Google' });

        analytics.didNotCall(window.ga, 'set', {
          metric1: '100',
          metric2: '5',
          dimension2: 'Google'
        });

        analytics.called(window.ga, 'send', 'event', {
          eventCategory: 'All',
          eventAction: 'Level Unlocked',
          eventLabel: undefined,
          eventValue: 0,
          nonInteraction: false,
          metric1: '100',
          metric2: '5',
          dimension2: 'Google'
        });
      });
    });

    describe('ecommerce', function() {
      beforeEach(function() {
        analytics.stub(window, 'ga');
      });

      it('should require ecommerce.js', function() {
        analytics.track('order completed', { orderId: 'ee099bf7' });
        analytics.called(window.ga, 'require', 'ecommerce');
        analytics.assert(ga.ecommerce);
      });

      it('should not require ecommerce if .ecommerce is true', function() {
        ga.ecommerce = true;
        analytics.track('order completed', { orderId: 'e213e4da' });
        analytics.didNotCall(window.ga, 'require', 'ecommerce');
      });

      it('should send simple ecommerce data', function() {
        analytics.track('order completed', { orderId: '7306cc06' });
        analytics.assert(window.ga.args.length === 3);
        analytics.assert(window.ga.args[1][0] === 'ecommerce:addTransaction');
        analytics.assert(window.ga.args[2][0] === 'ecommerce:send');
      });

      it('should send ecommerce data', function() {
        analytics.track('order completed', {
          orderId: '780bc55',
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

        analytics.deepEqual(window.ga.args[1], ['ecommerce:addTransaction', {
          id: '780bc55',
          revenue: 99.99,
          shipping: 13.99,
          tax: 20.99,
          currency: 'USD'
        }]);

        analytics.deepEqual(window.ga.args[2], ['ecommerce:addItem', {
          id: '780bc55',
          name: 'my product',
          price: 24.75,
          quantity: 1,
          sku: 'p-298',
          currency: 'USD'
        }]);

        analytics.deepEqual(window.ga.args[3], ['ecommerce:addItem', {
          id: '780bc55',
          name: 'other product',
          price: 24.75,
          sku: 'p-299',
          quantity: 3,
          currency: 'USD'
        }]);

        analytics.deepEqual(window.ga.args[4], ['ecommerce:send']);
      });

      it('should fallback to revenue', function() {
        analytics.track('order completed', {
          orderId: '5d4c7cb5',
          revenue: 99.9,
          shipping: 13.99,
          tax: 20.99,
          products: []
        });

        analytics.deepEqual(window.ga.args[1], ['ecommerce:addTransaction', {
          id: '5d4c7cb5',
          revenue: 99.9,
          shipping: 13.99,
          tax: 20.99,
          currency: 'USD'
        }]);
      });

      it('should pass custom currency', function() {
        analytics.track('order completed', {
          orderId: '5d4c7cb5',
          revenue: 99.9,
          shipping: 13.99,
          tax: 20.99,
          products: [],
          currency: 'EUR'
        });

        analytics.deepEqual(window.ga.args[1], ['ecommerce:addTransaction', {
          id: '5d4c7cb5',
          revenue: 99.9,
          shipping: 13.99,
          tax: 20.99,
          currency: 'EUR'
        }]);
      });
    });
  });
});