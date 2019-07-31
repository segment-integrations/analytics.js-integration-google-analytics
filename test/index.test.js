'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var integration = require('@segment/analytics.js-integration');
var Oiq = require('../lib/');

describe('Oiq', function() {
  var analytics;
  var oiq;
  var options = {
    oiq_lifecycle: 'rcpt'
  };

  beforeEach(function() {
    analytics = new Analytics();
    oiq = new Oiq(options);
    analytics.use(Oiq);
    analytics.use(tester);
    analytics.add(oiq);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    oiq.reset();
    sandbox();
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(oiq, 'load');
    });

    it('should have the right settings', function() {
      analytics.compare(Oiq, integration('Oiq')
        .global('_oiqq')
        .option('oiq_lifecycle','rcpt'));
    });

    describe('#initialize', function() {
      it('should call load on initialize', function() {
        analytics.initialize();
        analytics.called(oiq.load);
      });

      it('should create window._oiqq', function() {
        analytics.initialize();
        analytics.assert(window._oiqq);
      });
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window._oiqq, 'push');
      });

      it('should track a pageview', function() {
        analytics.page();
        setTimeout(function() {
          analytics.assert(window._oiqq[0]);
          analytics.assert(window._oiqq[0][0] === 'oiq_addPageLifecycle');
          analytics.assert(window._oiqq[0][1] === 'inte');
        },1000);
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window._oiqq, 'push');
      });

      describe('Ecommerce', function() {
        it('should track dct data', function() {
          analytics.track('Order Completed', {
            products: [
              { product_id: '507f1f77bcf86cd799439011' },
              { product_id: '505bd76785ebb509fc183733' }
            ],
            currency: 'USD',
            total: 0.50,
            tax: 0.10,
            orderId: 123
          });

          setTimeout(function() {
            analytics.assert(window._oiqq.map(function(kvp) {
              return kvp[1][0] === 'order_id';
            }).length === 1);
            analytics.assert(window._oiqq.filter(function(kvp) {
              return kvp[1][0] === 'order_id';
            })[1][1] === 123);
          }, 1000);

          setTimeout(function() {
            analytics.assert(window._oiqq.map(function(kvp) {
              return kvp[1][0] === 'total_cost_notax';
            }).length === 1);
            analytics.assert(window._oiqq.filter(function(kvp) {
              return kvp[1][0] === 'total_cost_notax';
            })[1][1] === 0.5);
          }, 1000);

          setTimeout(function() {
            analytics.assert(window._oiqq.map(function(kvp) {
              return kvp[1][0] === 'total_cost_tax';
            }).length);
            analytics.assert(window._oiqq.filter(function(kvp) {
              return kvp[1][0] === 'total_cost_tax';
            })[1][1] === 0.6);

            analytics.assert(window._oiqq.map(function(kvp) {
              return kvp[0] === 'oiq_doTag';
            }).length === 1);
          }, 1000);

          setTimeout(function() {
            analytics.assert(window._oiqq.map(function(kvp) {
              return kvp[0] === 'oiq_doTag';
            }).length === 1);
          }, 1000);
        });
      });
    });
  });
});