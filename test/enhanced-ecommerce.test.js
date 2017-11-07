'use strict';

/**
 * Module dependencies.
 */
var Analytics = require('@segment/analytics.js-core').constructor;
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var plugin = require('../lib/');
var toArray = require('to-array');

describe('Universal Enhanced Ecommerce', function() {
  var GA = plugin.Integration;
  var analytics;
  var ga;
  var settings = {
    enhancedEcommerce: true,
    anonymizeIp: true,
    domain: 'none',
    siteSpeedSampleRate: 42,
    trackingId: 'UA-27033709-12'
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

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('enhanced ecommerce', function() {
      beforeEach(function() {
        analytics.stub(window, 'ga');
      });

      it('should require ec.js', function() {
        analytics.track('order completed', { orderId: 'ee099bf7' });
        analytics.assert(window.ga.args.length > 0);
        analytics.deepEqual(window.ga.args[0], ['require', 'ec']);
      });

      it('should not require ec if .enhancedEcommerceLoaded is true', function() {
        ga.enhancedEcommerceLoaded = true;
        analytics.track('order completed', { orderId: 'e213e4da' });
        analytics.assert(window.ga.args.length > 0);
        analytics.notDeepEqual(window.ga.args[0], ['require', 'ec']);
      });

      it('should set currency for ec.js  to default', function() {
        analytics.track('order completed', { orderId: 'ee099bf7' });
        analytics.deepEqual(window.ga.args[1], ['set', '&cu', 'USD']);
      });

      it('should set currency for ec.js to custom currency', function() {
        analytics.track('order completed', { orderId: 'ee099bf7', currency: 'EUR' });
        analytics.deepEqual(window.ga.args[1], ['set', '&cu', 'EUR']);
      });

      it('should send product added data', function() {
        analytics.track('product added', {
          currency: 'CAD',
          quantity: 1,
          price: 24.75,
          name: 'my product',
          category: 'cat 1',
          sku: 'p-298'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'add', {}]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'cat 1', 'product added', { nonInteraction: 1 }]);
      });

      it('should send send label tracking enhanced ecommerce events with Univeral Analytics', function() {
        analytics.track('product added', {
          currency: 'CAD',
          quantity: 1,
          price: 24.75,
          name: 'my product',
          category: 'cat 1',
          sku: 'p-298',
          label: 'sample label'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'add', {}]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'cat 1', 'product added', 'sample label', { nonInteraction: 1 }]);
      });

      it('should send product removed data', function() {
        analytics.track('product removed', {
          currency: 'CAD',
          quantity: 1,
          price: 24.75,
          name: 'my product',
          category: 'cat 1',
          sku: 'p-298'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'remove', {}]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'cat 1', 'product removed', { nonInteraction: 1 }]);
      });

      it('should send product viewed data', function() {
        analytics.track('product viewed', {
          currency: 'CAD',
          quantity: 1,
          price: 24.75,
          name: 'my product',
          category: 'cat 1',
          sku: 'p-298',
          list: 'Apparel Gallery'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'detail', { list: 'Apparel Gallery' }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'cat 1', 'product viewed', { nonInteraction: 1 }]);
        analytics.assert(window.ga.args[1][0] === 'set');
      });

      it('should send product impression data via product list viewed', function() {
        // If using addImpression ever becomes optional, will need to add a setting modification here.
        analytics.track('Product List Viewed', {
          category: 'cat 1',
          list_id: '1234',
          products: [
            { product_id: '507f1f77bcf86cd799439011' }
          ]
        });
        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'USD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addImpression', {
          id: '507f1f77bcf86cd799439011',
          category: 'cat 1',
          list: '1234',
          position: 1
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'cat 1', 'Product List Viewed', { nonInteraction: 1 }]);
      });

      it('should send product impression data via product list filtered', function() {
        // If using addImpression ever becomes optional, will need to add a setting modification here.
        analytics.track('Product List Filtered', {
          category: 'cat 1',
          list_id: '1234',
          filters: [    {
            type: 'department',
            value: 'beauty'
          },
          {
            type: 'price',
            value: 'under'
          }],
          sorts:[ {
            type: 'price',
            value: 'desc'
          }],
          products: [
            { product_id: '507f1f77bcf86cd799439011' }
          ]
        });
        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'USD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addImpression', {
          id: '507f1f77bcf86cd799439011',
          category: 'cat 1',
          list: '1234',
          position: 1,
          variant: 'department:beauty,price:under::price:desc'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'cat 1', 'Product List Filtered', { nonInteraction: 1 }]);
      });

      it('should send product clicked data', function() {
        analytics.track('product clicked', {
          currency: 'CAD',
          quantity: 1,
          price: 24.75,
          name: 'my product',
          category: 'cat 1',
          sku: 'p-298',
          list: 'search results'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'click', { list: 'search results' }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'cat 1', 'product clicked', { nonInteraction: 1 }]);
      });

      it('should send promotion viewed data', function() {
        analytics.track('promotion viewed', {
          currency: 'CAD',
          promotion_id: 'PROMO_1234',
          name: 'Summer Sale',
          creative: 'summer_banner2',
          position: 'banner_slot1'
        });

        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addPromo', {
          id: 'PROMO_1234',
          name: 'Summer Sale',
          creative: 'summer_banner2',
          position: 'banner_slot1'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'EnhancedEcommerce', 'promotion viewed', { nonInteraction: 1 }]);
      });

      it('should send promotion clicked data', function() {
        analytics.track('promotion clicked', {
          currency: 'CAD',
          promotion_id: 'PROMO_1234',
          name: 'Summer Sale',
          creative: 'summer_banner2',
          position: 'banner_slot1'
        });

        analytics.assert(window.ga.args.length === 5);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addPromo', {
          id: 'PROMO_1234',
          name: 'Summer Sale',
          creative: 'summer_banner2',
          position: 'banner_slot1'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:setAction', 'promo_click', {}]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['send', 'event', 'EnhancedEcommerce', 'promotion clicked', { nonInteraction: 1 }]);
      });

      it('should send order started data', function() {
        analytics.track('checkout started', {
          currency: 'CAD',
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
          }],
          step: 1,
          paymentMethod: 'Visa'
        });
        analytics.assert(window.ga.args.length === 6);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:addProduct', {
          id: 'p-299',
          name: 'other product',
          quantity: 3,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['ec:setAction', 'checkout', {
          step: 1,
          option: 'Visa'
        }]);
        analytics.deepEqual(toArray(window.ga.args[5]), ['send', 'event', 'EnhancedEcommerce', 'checkout started', { nonInteraction: 1 }]);
      });

      it('should send order updated data', function() {
        analytics.track('order updated', {
          currency: 'CAD',
          products: [{
            quantity: 1,
            price: 24.75,
            name: 'my product',
            category: 'cat 1',
            sku: 'p-298'
          }, {
            quantity: 3,
            price: 24.75,
            name: 'other product',
            category: 'cat 2',
            sku: 'p-299'
          }],
          step: 1,
          paymentMethod: 'Visa'
        });
        analytics.assert(window.ga.args.length === 6);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:addProduct', {
          id: 'p-299',
          name: 'other product',
          category: 'cat 2',
          quantity: 3,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['ec:setAction', 'checkout', {
          step: 1,
          option: 'Visa'
        }]);
        analytics.deepEqual(toArray(window.ga.args[5]), ['send', 'event', 'EnhancedEcommerce', 'order updated', { nonInteraction: 1 }]);
      });

      it('should send checkout step viewed data', function() {
        analytics.track('checkout step viewed', {
          currency: 'CAD',
          step: 2
        });
        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'checkout', {
          step: 2
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'EnhancedEcommerce', 'checkout step viewed', { nonInteraction: 1 }]);
      });

      it('should send checkout step completed data', function() {
        analytics.track('checkout step completed', {
          currency: 'CAD',
          step: 2,
          shippingMethod: 'FedEx'
        });

        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'checkout_option', {
          step: 2,
          option: 'FedEx'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'Checkout', 'Option']);
      });

      it('should send checkout step completed data with all options', function() {
        analytics.track('checkout step completed', {
          currency: 'CAD',
          step: 2,
          paymentMethod: 'Visa',
          shippingMethod: 'FedEx'
        });

        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'checkout_option', {
          step: 2,
          option: 'Visa, FedEx'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'Checkout', 'Option']);
      });

      it('should not send checkout step completed data without a step', function() {
        analytics.track('checkout step completed', {
          currency: 'CAD',
          shippingMethod: 'FedEx'
        });

        analytics.assert(window.ga.args.length === 0);
      });

      it('should not send checkout step completed data without an option', function() {
        analytics.track('checkout step completed', {
          currency: 'CAD',
          step: 2
        });

        analytics.assert(window.ga.args.length === 0);
      });

      it('should send simple order completed data', function() {
        analytics.track('order completed', { orderId: '7306cc06' });
        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'purchase', {
          id: '7306cc06',
          revenue: 0.0
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'EnhancedEcommerce', 'order completed', { nonInteraction: 1 }]);
      });

      it('should send order completed data', function() {
        analytics.track('order completed', {
          orderId: '780bc55',
          total: 99.9,
          shipping: 13.99,
          tax: 20.99,
          currency: 'CAD',
          coupon: 'coupon',
          affiliation: 'affiliation',
          products: [{
            quantity: 1,
            price: 24.75,
            name: 'my product',
            category: 'cat 1',
            sku: 'p-298'
          }, {
            quantity: 3,
            price: 24.75,
            name: 'other product',
            category: 'cat 2',
            sku: 'p-299',
            currency: 'EUR'
          }]
        });
        analytics.assert(window.ga.args.length === 6);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:addProduct', {
          id: 'p-299',
          name: 'other product',
          category: 'cat 2',
          quantity: 3,
          price: 24.75,
          currency: 'EUR'
        }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['ec:setAction', 'purchase', {
          id: '780bc55',
          affiliation: 'affiliation',
          revenue: 99.9,
          tax: 20.99,
          shipping: 13.99,
          coupon: 'coupon'
        }]);
        analytics.deepEqual(toArray(window.ga.args[5]), ['send', 'event', 'EnhancedEcommerce', 'order completed', { nonInteraction: 1 }]);
      });

      it('should add coupon to product level in order completed', function() {
        analytics.track('order completed', {
          orderId: '780bc55',
          total: 99.9,
          shipping: 13.99,
          tax: 20.99,
          currency: 'CAD',
          coupon: 'coupon',
          affiliation: 'affiliation',
          products: [{
            quantity: 1,
            price: 24.75,
            name: 'my product',
            category: 'cat 1',
            sku: 'p-298',
            coupon: 'promo'
          }, {
            quantity: 3,
            price: 24.75,
            name: 'other product',
            category: 'cat 2',
            sku: 'p-299',
            currency: 'EUR'
          }]
        });

        analytics.assert(window.ga.args.length === 6);
        analytics.deepEqual(toArray(window.ga.args[1]), ['set', '&cu', 'CAD']);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          name: 'my product',
          category: 'cat 1',
          quantity: 1,
          price: 24.75,
          currency: 'CAD',
          coupon: 'promo'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:addProduct', {
          id: 'p-299',
          name: 'other product',
          category: 'cat 2',
          quantity: 3,
          price: 24.75,
          currency: 'EUR'
        }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['ec:setAction', 'purchase', {
          id: '780bc55',
          affiliation: 'affiliation',
          revenue: 99.9,
          tax: 20.99,
          shipping: 13.99,
          coupon: 'coupon'
        }]);
        analytics.deepEqual(toArray(window.ga.args[5]), ['send', 'event', 'EnhancedEcommerce', 'order completed', { nonInteraction: 1 }]);
      });

      it('order completed should fallback to revenue', function() {
        analytics.track('order completed', {
          orderId: '5d4c7cb5',
          revenue: 99.9,
          shipping: 13.99,
          tax: 20.99,
          products: []
        });

        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'purchase', {
          id: '5d4c7cb5',
          revenue: 99.9,
          tax: 20.99,
          shipping: 13.99
        }]);
      });

      it('should send full order refunded data', function() {
        analytics.track('order refunded', { orderId: '780bc55' });

        analytics.assert(window.ga.args.length === 4);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:setAction', 'refund', {
          id: '780bc55'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['send', 'event', 'EnhancedEcommerce', 'order refunded', { nonInteraction: 1 }]);
      });

      it('should send partial order refunded data', function() {
        analytics.track('order refunded', {
          orderId: '780bc55',
          products: [{
            quantity: 1,
            sku: 'p-298'
          }, {
            quantity: 2,
            sku: 'p-299'
          }]
        });

        analytics.assert(window.ga.args.length === 6);
        analytics.deepEqual(toArray(window.ga.args[2]), ['ec:addProduct', {
          id: 'p-298',
          quantity: 1,
          currency: 'USD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[3]), ['ec:addProduct', {
          id: 'p-299',
          quantity: 2,
          currency: 'USD'
        }]);
        analytics.deepEqual(toArray(window.ga.args[4]), ['ec:setAction', 'refund', {
          id: '780bc55'
        }]);
        analytics.deepEqual(toArray(window.ga.args[5]), ['send', 'event', 'EnhancedEcommerce', 'order refunded', { nonInteraction: 1 }]);
      });
    });
  });
});