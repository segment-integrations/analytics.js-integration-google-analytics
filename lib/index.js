'use strict';

/**
 * Module dependencies.
 */

var integration = require('@segment/analytics.js-integration');
var extend = require('@ndhoule/extend');
var reject = require('reject');
var each = require('component-each');
var len = require('object-component').length;
var classic = require('./classic');
var universal = require('./universal');
var enhancedEcommerce = require('./enhanced-ecommerce');
var metrics = require('./utils').metrics;
var createProductTrack = require('./utils').createProductTrack;

/**
 * Expose plugin.
 */

module.exports = exports = function(analytics) {
  // eslint-disable-next-line no-use-before-define
  analytics.addIntegration(GA);
};

/**
 * Expose `GA` integration.
 *
 * http://support.google.com/analytics/bin/answer.py?hl=en&answer=2558867
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration#_gat.GA_Tracker_._setSiteSpeedSampleRate
 */

var GA = exports.Integration = integration('Google Analytics')
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
  .option('sampleRate', 100)
  .option('trackCategorizedPages', true)
  .option('trackNamedPages', true)
  .option('trackingId', '')
  .option('optimize', '')
  .option('nameTracker', false)
  .tag('library', '<script src="//www.google-analytics.com/analytics.js">')
  .tag('double click', '<script src="//stats.g.doubleclick.net/dc.js">')
  .tag('http', '<script src="http://www.google-analytics.com/ga.js">')
  .tag('https', '<script src="https://ssl.google-analytics.com/ga.js">');

/**
 * On `construct` swap any config-based methods to the proper implementation.
 */

GA.on('construct', function(integration) {
  if (integration.options.classic) {
    integration = extend(integration, classic);
  } else {
    integration = extend(integration, universal, integration.options.enhancedEcommerce ? enhancedEcommerce : {});
  }
});

/**
 * Identify.
 *
 * @api public
 * @param {Identify} event
 */

GA.prototype.identify = function(identify) {
  var opts = this.options;

  if (opts.sendUserId && identify.userId()) {
    window.ga(this._trackerName + 'set', 'userId', identify.userId());
  }

  // Set dimensions
  var custom = metrics(identify.traits(), opts);
  if (len(custom)) window.ga(this._trackerName + 'set', custom);
};


/**
 * Order completed.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#multicurrency
 *
 * @param {Track} track
 * @api private
 */

GA.prototype.orderCompleted = function(track) {
  var total = track.total() || track.revenue() || 0;
  var orderId = track.orderId();
  var products = track.products();
  var props = track.properties();
  var self = this;

  // orderId is required.
  if (!orderId) return;

  // require ecommerce
  if (!this.ecommerce) {
    window.ga(this._trackerName + 'require', 'ecommerce');
    this.ecommerce = true;
  }

  // add transaction
  window.ga(this._trackerName + 'ecommerce:addTransaction', reject({
    affiliation: props.affiliation,
    shipping: track.shipping(),
    revenue: total,
    tax: track.tax(),
    id: orderId,
    currency: track.currency()
  }));

  // add products
  each(products, function(product) {
    var productTrack = createProductTrack(track, product);
    window.ga(self._trackerName + 'ecommerce:addItem', reject({
      category: productTrack.category(),
      quantity: productTrack.quantity(),
      price: productTrack.price(),
      name: productTrack.name(),
      sku: productTrack.sku(),
      id: orderId,
      currency: productTrack.currency()
    }));
  });

  // send
  window.ga(this._trackerName + 'ecommerce:send');
};