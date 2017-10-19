'use strict';

/**
 * Module dependencies.
 */

var Track = require('segmentio-facade').Track;
var defaults = require('@ndhoule/defaults');
var dot = require('obj-case');
var each = require('component-each');
var integration = require('@segment/analytics.js-integration');
var is = require('is');
var len = require('object-component').length;
var push = require('global-queue')('_gaq');
var reject = require('reject');
var useHttps = require('use-https');
var user;

/**
 * Expose plugin.
 */

module.exports = exports = function(analytics) {
  // eslint-disable-next-line no-use-before-define
  analytics.addIntegration(GA);
  user = analytics.user();
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
    integration.initialize = integration.initializeClassic;
    integration.loaded = integration.loadedClassic;
    integration.page = integration.pageClassic;
    integration.track = integration.trackClassic;
    integration.orderCompleted = integration.completedOrderClassic;
  } else if (integration.options.enhancedEcommerce) {
    integration.productViewed = integration.productViewedEnhanced;
    integration.productClicked = integration.productClickedEnhanced;
    integration.productAdded = integration.productAddedEnhanced;
    integration.productRemoved = integration.productRemovedEnhanced;
    integration.checkoutStarted = integration.checkoutStartedEnhanced;
    integration.checkoutStepViewed = integration.checkoutStepViewedEnhanced;
    integration.checkoutStepCompleted = integration.checkoutStepCompletedEnhanced;
    integration.orderUpdated = integration.orderUpdatedEnhanced;
    integration.orderCompleted = integration.orderCompletedEnhanced;
    integration.orderRefunded = integration.orderRefundedEnhanced;
    integration.promotionViewed = integration.promotionViewedEnhanced;
    integration.promotionClicked = integration.promotionClickedEnhanced;
    integration.productListViewed = integration.productListViewedEnhanced;
    integration.productListFiltered = integration.productListFilteredEnhanced;
  }
});

/**
 * Initialize.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/advanced
 */

GA.prototype.initialize = function() {
  var options = this.options;

  // Allows for local testing.
  if (window.location.hostname === 'localhost') options.domain = 'none';

  /**
   * Initialization Options: https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#create
   *
   * Currently unsupported: https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#create
   * clientId, alwaysSendReferrer, allowAnchor, cookieName, cookieExpires, storeGac, legacyCookieDomain, legacyHistoryImport
  */

  var initializeOptions = reject({
    // tracker name must be set even if empty to avoid undefined references when prepending
    name: options.nameTracker ? 'segmentGATracker' : '',
    sampleRate: options.sampleRate,
    siteSpeedSampleRate: options.siteSpeedSampleRate,
    cookieDomain: options.domain,
    allowLinker: true
  });

  /**
   * Global options:
   * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#general
   * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#user

   * Currently unsupported:
   * dataSource, queueTime, forceSSL, transport, useBeacon, linkerParam, hitCallback
  */

  var globalOptions = reject({
    anonymizeIp: options.anonymizeIp,
    userId: options.sendUserId && user.id()
  });

  // Set trackerName for easier lookup throughout protoype methods.
  this._trackerName = initializeOptions.name;
  this.pageCalled = false;

  // setup the tracker globals
  window.GoogleAnalyticsObject = 'ga';
  window.ga = window.ga || function() {
    window.ga.q = window.ga.q || [];
    window.ga.q.push(arguments);
  };
  window.ga.l = new Date().getTime();


  // Create with initializeOptions.
  window.ga('create', options.trackingId, initializeOptions);

  // Set global options.
  each(globalOptions, function(value, key) {
    window.ga(this._trackerName + 'set', key, value)
  });

  // Require supported plugins.
  // TODO: is this still supported?
  if (options.optimize) window.ga(this._trackerName + 'require', options.optimize);

  // Display features: https://developers.google.com/analytics/devguides/collection/analyticsjs/display-features
  if (options.doubleClick) window.ga(this._trackerName + 'require', 'displayfeatures');

  // Enhanced link attribution: https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-link-attribution
  // https://support.google.com/analytics/answer/2558867?hl=en
  if (options.enhancedLinkAttribution) window.ga(this._trackerName + 'require', 'linkid', 'linkid.js');

  // initialize page with `id` appended to user's traits
  // sets `id` as a custom dimension for the lifetime of the tracker object and
  // ensures `id` sent as a custom dimension for all hits on the page
  var userTraits = user.traits();

  if (user.id()) userTraits.id = user.id();

  // custom dimensions & metrics
  var custom = metrics(userTraits, opts);

  if (len(custom)) window.ga(this._trackerName + 'set', custom);

  this.load('library', this.ready);
};

/**
 * Loaded?
 *
 * @return {Boolean}
 */

GA.prototype.loaded = function() {
  return !!window.gaplugins;
};

/**
 * Page.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/single-page-applications#multiple-hits
 *
 * @api public
 * @param {Page} page
 */

GA.prototype.page = function(page) {
  var category = page.category();
  var props = page.properties();
  var name = page.fullName();
  var opts = this.options;
  var campaign = page.proxy('context.campaign') || {};
  var pageview = {};
  var pagePath = path(props, this.options);
  var pageTitle = name || props.title;
  var pageReferrer = page.referrer() || '';
  var track;

  // store for later
  // TODO: Why? Document this better
  this._category = category;

  pageview.page = pagePath;
  pageview.title = pageTitle;
  pageview.location = props.url;

  if (campaign.name) pageview.campaignName = campaign.name;
  if (campaign.source) pageview.campaignSource = campaign.source;
  if (campaign.medium) pageview.campaignMedium = campaign.medium;
  if (campaign.content) pageview.campaignContent = campaign.content;
  if (campaign.term) pageview.campaignKeyword = campaign.term;

  // set
  var payload = {
    page: pagePath,
    title: pageTitle
  };

  // custom dimensions, metrics and content groupings
  var custom = metrics(props, opts);
  if (len(custom)) {
    if (opts.setAllMappedProps) {
      window.ga(this._trackerName + 'set', custom);
    } else {
      // Add custom dimensions / metrics to pageview payload
      each(custom, function(key, value) {
        pageview[key] = value;
      });
    }
  }

  if (pageReferrer !== document.referrer) payload.referrer = pageReferrer; // allow referrer override if referrer was manually set
  window.ga(this._trackerName + 'set', payload);

  if (this.pageCalled) delete pageview.location;

  // send
  window.ga(this._trackerName + 'send', 'pageview', pageview);

  // categorized pages
  if (category && this.options.trackCategorizedPages) {
    track = page.track(category);
    this.track(track, { nonInteraction: 1 });
  }

  // named pages
  if (name && this.options.trackNamedPages) {
    track = page.track(name);
    this.track(track, { nonInteraction: 1 });
  }

  this.pageCalled = true;
};

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
 * Track.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference
 *
 * @param {Track} event
 */

GA.prototype.track = function(track, options) {
  var contextOpts = track.options(this.name);
  var interfaceOpts = this.options;
  var opts = defaults(options || {}, contextOpts);
  opts = defaults(opts, interfaceOpts);
  var props = track.properties();
  var campaign = track.proxy('context.campaign') || {};

  var payload = {
    eventAction: track.event(),
    eventCategory: track.category() || this._category || 'All',
    eventLabel: props.label,
    eventValue: formatValue(props.value || track.revenue()),
    // Allow users to override their nonInteraction integration setting for any single particluar event.
    nonInteraction: props.nonInteraction !== undefined ? !!props.nonInteraction : !!opts.nonInteraction
  };

  if (campaign.name) payload.campaignName = campaign.name;
  if (campaign.source) payload.campaignSource = campaign.source;
  if (campaign.medium) payload.campaignMedium = campaign.medium;
  if (campaign.content) payload.campaignContent = campaign.content;
  if (campaign.term) payload.campaignKeyword = campaign.term;

  // custom dimensions & metrics
  var custom = metrics(props, interfaceOpts);
  if (len(custom)) {
    if (interfaceOpts.setAllMappedProps) {
      window.ga(this._trackerName + 'set', custom);
    } else {
      // Add custom dimensions / metrics to payload
      each(custom, function(key, value) {
        payload[key] = value;
      });
    }
  }

  window.ga(this._trackerName + 'send', 'event', payload);
};

/**
 * Order Completed.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#multicurrency
 *
 * @param {Track} track
 * @api public
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
  window.ga(this._trackerName + 'ecommerce:addTransaction', {
    affiliation: props.affiliation,
    shipping: track.shipping(),
    revenue: total,
    tax: track.tax(),
    id: orderId,
    currency: track.currency()
  });

  // add products
  each(products, function(product) {
    var productTrack = createProductTrack(track, product);
    window.ga(self._trackerName + 'ecommerce:addItem', {
      category: productTrack.category(),
      quantity: productTrack.quantity(),
      price: productTrack.price(),
      name: productTrack.name(),
      sku: productTrack.sku(),
      id: orderId,
      currency: productTrack.currency()
    });
  });

  // send
  window.ga(this._trackerName + 'ecommerce:send');
};

/**
 * Initialize (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration
 */

GA.prototype.initializeClassic = function() {
  var opts = this.options;
  var anonymize = opts.anonymizeIp;
  var domain = opts.domain;
  var enhanced = opts.enhancedLinkAttribution;
  var ignore = opts.ignoredReferrers;
  var sample = opts.siteSpeedSampleRate;

  window._gaq = window._gaq || [];
  push('_setAccount', opts.trackingId);
  push('_setAllowLinker', true);

  if (anonymize) push('_gat._anonymizeIp');
  if (domain) push('_setDomainName', domain);
  if (sample) push('_setSiteSpeedSampleRate', sample);

  if (enhanced) {
    var protocol = document.location.protocol === 'https:' ? 'https:' : 'http:';
    var pluginUrl = protocol + '//www.google-analytics.com/plugins/ga/inpage_linkid.js';
    push('_require', 'inpage_linkid', pluginUrl);
  }

  if (ignore) {
    if (!is.array(ignore)) ignore = [ignore];
    each(ignore, function(domain) {
      push('_addIgnoredRef', domain);
    });
  }

  if (this.options.doubleClick) {
    this.load('double click', this.ready);
  } else {
    var name = useHttps() ? 'https' : 'http';
    this.load(name, this.ready);
  }
};

/**
 * Loaded? (classic)
 *
 * @return {Boolean}
 */

GA.prototype.loadedClassic = function() {
  return !!(window._gaq && window._gaq.push !== Array.prototype.push);
};

/**
 * Page (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration
 *
 * @param {Page} page
 */

GA.prototype.pageClassic = function(page) {
  var category = page.category();
  var props = page.properties();
  var name = page.fullName();
  var track;

  push('_trackPageview', path(props, this.options));

  // categorized pages
  if (category && this.options.trackCategorizedPages) {
    track = page.track(category);
    this.track(track, { nonInteraction: 1 });
  }

  // named pages
  if (name && this.options.trackNamedPages) {
    track = page.track(name);
    this.track(track, { nonInteraction: 1 });
  }
};

/**
 * Track (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiEventTracking
 *
 * @param {Track} track
 */

GA.prototype.trackClassic = function(track, options) {
  var opts = options || track.options(this.name);
  var props = track.properties();
  var revenue = track.revenue();
  var event = track.event();
  var category = this._category || track.category() || 'All';
  var label = props.label;
  var value = formatValue(revenue || props.value);
  var nonInteraction = !!(props.nonInteraction || opts.nonInteraction);
  push('_trackEvent', category, event, label, value, nonInteraction);
};

/**
 * Completed order.
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingEcommerce
 * https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingEcommerce#localcurrencies
 *
 * @param {Track} track
 * @api private
 */

GA.prototype.completedOrderClassic = function(track) {
  var total = track.total() || track.revenue() || 0;
  var orderId = track.orderId();
  var products = track.products() || [];
  var props = track.properties();
  var currency = track.currency();

  // required
  if (!orderId) return;

  // add transaction
  push('_addTrans',
    orderId,
    props.affiliation,
    total,
    track.tax(),
    track.shipping(),
    track.city(),
    track.state(),
    track.country());

  // add items
  each(products, function(product) {
    var track = new Track({ properties: product });
    push('_addItem',
      orderId,
      track.sku(),
      track.name(),
      track.category(),
      track.price(),
      track.quantity());
  });

  // send
  push('_set', 'currencyCode', currency);
  push('_trackTrans');
};

/**
 * Loads ec.js (unless already loaded)
 *
 * @param {Track} track
 */

GA.prototype.loadEnhancedEcommerce = function(track) {

  if (!this.enhancedEcommerceLoaded) {
    window.ga(this._trackerName + 'require', 'ec');
    this.enhancedEcommerceLoaded = true;
  }

  // Ensure we set currency for every hit
  window.ga(this._trackerName + 'set', '&cu', track.currency());
};

/**
 * Pushes an event and all previously set EE data to GA.
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.pushEnhancedEcommerce = function(track) {
  // Send a custom non-interaction event to ensure all EE data is pushed.
  // Without doing this we'd need to require page display after setting EE data.
  var args = reject([
    this._trackerName + 'send',
    'event',
    track.category() || 'EnhancedEcommerce',
    track.event() || 'Action not defined',
    track.properties().label,
    { nonInteraction: 1 }
  ]);

  window.ga.apply(window, args);
};

/**
 * Started order - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#checkout-steps
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.checkoutStartedEnhanced = function(track) {
  // same as viewed checkout step #1
  this.checkoutStepViewed(track);
};

/**
 * Updated order - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#checkout-steps
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.orderUpdatedEnhanced = function(track) {
  // Same event as started order - will override
  this.checkoutStepViewed(track);
};

/**
 * Viewed checkout step - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#checkout-steps
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.checkoutStepViewedEnhanced = function(track) {
  var products = track.products();
  var self = this;

  this.loadEnhancedEcommerce(track);

  each(products, function(product) {
    product = createProductTrack(track, product);
    window.ga(self._trackerName + 'ec:addProduct', buildProductFieldObject(track, product));
  });

  window.ga(self._trackerName + 'ec:setAction', 'checkout', buildActionFieldObject(track, 'checkout'));

  this.pushEnhancedEcommerce(track);
};

/**
 * Completed checkout step - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#checkout-options
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.checkoutStepCompletedEnhanced = function(track) {

  this.loadEnhancedEcommerce(track);

  window.ga(self._trackerName + 'ec:setAction', 'checkout_option', buildActionFieldObject(track, 'checkout_option'));

  window.ga(self._trackerName + 'send', 'event', 'Checkout', 'Option');

  this.pushEnhancedEcommerce(track);
};

/**
 * Completed order - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-transactions
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.orderCompletedEnhanced = function(track) {
  var products = track.products();
  var self = this;

  this.loadEnhancedEcommerce(track);

  each(products, function(product) {
    product = createProductTrack(track, product);
    window.ga(self._trackerName + 'ec:addProduct', buildProductFieldObject(track, product));
  });

  window.ga(self._trackerName + 'ec:setAction', 'purchase', buildActionFieldObject(track, 'purchase'));

  this.pushEnhancedEcommerce(track);
};

/**
 * Refunded order - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-refunds
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.orderRefundedEnhanced = function(track) {
  var products = track.products();
  var self = this;

  this.loadEnhancedEcommerce(track);

  // Without any products it's a full refund
  each(products, function(product) {
    product = createProductTrack(track, product);
    window.ga(self._trackerName + 'ec:addProduct', buildProductFieldObject(track, product));
  });

  window.ga(self._trackerName + 'ec:setAction', 'refund', buildActionFieldObject(track, 'refund'));

  this.pushEnhancedEcommerce(track);
};

/**
 * Added product - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#add-remove-cart
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productAddedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addProduct', buildProductFieldObject(track));

  window.ga(this._trackerName + 'ec:setAction', 'add', buildActionFieldObject(track));

  this.pushEnhancedEcommerce(track);
};

/**
 * Removed product - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#add-remove-cart
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productRemovedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addProduct', buildProductFieldObject(track));

  window.ga(this._trackerName + 'ec:setAction', 'remove', buildActionFieldObject(track));

  this.pushEnhancedEcommerce(track);
};

/**
 * Viewed product details - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-detail-view
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productViewedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addProduct', buildProductFieldObject(track));

  window.ga(this._trackerName + 'ec:setAction', 'detail', buildActionFieldObject(track));

  this.pushEnhancedEcommerce(track);
};

/**
 * Clicked product - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-actions
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productClickedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addProduct', buildProductFieldObject(track));

  window.ga(this._trackerName + 'ec:setAction', 'click', buildActionFieldObject(track));

  this.pushEnhancedEcommerce(track);
};

/**
 * Viewed promotion - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-promo-impressions
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.promotionViewedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(self._trackerName + 'ec:addPromo', buildPromoFieldObject(track));

  this.pushEnhancedEcommerce(track);
};

/**
 * Clicked promotion - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-promo-clicks
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.promotionClickedEnhanced = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(self._trackerName + 'ec:addPromo', buildPromoFieldObject(track));

  window.ga(self._trackerName + 'ec:setAction', 'promo_click', {});

  this.pushEnhancedEcommerce(track);
};

/**
 * Product List Viewed - Enhanced Ecommerce (Mapped to Product Impression)
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-impression
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productListViewedEnhanced = function(track) {
  var products = track.products();
  var self = this;

  this.loadEnhancedEcommerce(track);

  each(products, function(product, index) {
    product = createProductTrack(track, product)
    window.ga(self._trackerName + 'ec:addImpression', buildImpressionFieldObject(index, track, product));
  });

  this.pushEnhancedEcommerce(track);
};

/**
 * Product List Filtered - Enhanced Ecommerce (Mapped to Product Impression)
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-impression
 *
 * @api private
 * @param {Track} track
 */

GA.prototype.productListFilteredEnhanced = function(track) {
  var props = track.properties();
  var products = track.products();
  props.filters = props.filters || [];
  props.sorters = props.sorters || [];
  var filters = props.filters.map(function(obj) { return obj.type + ':' + obj.value;}).join();
  var sorts = props.sorts.map(function(obj) { return obj.type + ':' + obj.value;}).join();
  var self = this;

  this.loadEnhancedEcommerce(track);
  each(products, function(product, index) {
    product = createProductTrack(track, product)
    var impressionFieldObject = buildImpressionFieldObject(index, track, product);

    // Product List Filered handles the variants prop based on the user's filters.
    impressionFieldObject.variant = filters + '::' + sorts;

    window.ga(self._trackerName + 'ec:addImpression', impressionFieldObject);
  });

  this.pushEnhancedEcommerce(track);
};

/**
 * Extracts checkout options.
 *
 * @api private
 * @param {Object} props
 * @return {string|null}
 */

function extractCheckoutOptions(track) {
  var options = [
    track.proxy('paymentMethod'),
    track.proxy('shippingMethod')
  ];

  // Remove all nulls, and join with commas.
  var valid = reject(options);
  return valid.length > 0 ? valid.join(', ') : null;
}

/**
 * Creates a track out of product properties.
 *
 * @api private
 * @param {Track} track
 * @param {Object} properties
 * @return {Track}
 */

function createProductTrack(track, properties) {
  properties.currency = properties.currency || track.currency();
  return new Track({ properties: properties });
}

function buildProductFieldObject(track, product) {
  if (!product) product = track;
  var properties = track.properties();

  return reject({
    id: product.productId() || product.id() || product.sku(),
    name: product.name(),
    category: product.category(),
    quantity: product.quantity(),
    price: product.price(),
    brand: properties.brand,
    variant: properties.variant,
    currency: product.currency(),
    coupon: track.coupon()
  });
}

function buildImpressionFieldObject(index, track, product) {
  var properties = track.properties();
  // If we don't have an ID/SKU or name, return - GA will reject the impression.
  if (!(product.productId() || product.sku()) && !product.name()) return;
  return reject({
    id: product.productId() || product.sku(),
    name: product.name(),
    category: product.category() || track.category(),
    list: properties.list_id || track.category() || 'search results',
    brand: product.properties().brand,
    variant: properties.variant,
    price: product.price(),
    position: index + 1
  });
}

function buildActionFieldObject(track, actionType) {
  var properties = track.properties();

  // orderId is required for any `purchase` or `refund` action types
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#action-data
  if ((actionType === 'purchase' || actionType === 'refund') && !track.orderid()) return;

  var payload = {
    id: track.orderId(),
    affiliation: properties.affiliation,
    revenue: track.total() || track.revenue() || 0,
    tax: track.tax(),
    list: properties.list,
    shipping: track.shipping(),
    coupon: track.coupon()
  };

  // Checkout actions can contain a `step` and `option` field.
  if (actionType === 'checkout' || actionType === 'checkout_option') {
    payload.step = properties.step || 1;
    payload.option = extractCheckoutOptions(track);
  }

  return reject(payload);
}

function buildPromoFieldObject(track) {
  var properties = track.properties();

  return reject({
    id: track.promotionId() || track.id(),
    name: track.name(),
    creative: properties.creative,
    position: properties.position
  });
}

/**
 * Return the path based on `properties` and `options`.
 *
 * @param {Object} properties
 * @param {Object} options
 * @return {string|undefined}
 */

function path(properties, options) {
  if (!properties) return;
  var str = properties.path;
  if (options.includeSearch && properties.search) str += properties.search;
  return str;
}

/**
 * Format the value property to Google's liking.
 *
 * @param {Number} value
 * @return {Number}
 */

function formatValue(value) {
  if (!value || value < 0) return 0;
  return Math.round(value);
}

/**
 * Map google's custom dimensions, metrics & content groupings with `obj`.
 *
 * Example:
 *
 *      metrics({ revenue: 1.9 }, { { metrics : { revenue: 'metric8' } });
 *      // => { metric8: 1.9 }
 *
 *      metrics({ revenue: 1.9 }, {});
 *      // => {}
 *
 * @param {Object} obj
 * @param {Object} data
 * @return {Object|null}
 * @api private
 */

function metrics(obj, data) {
  var dimensions = data.dimensions;
  var metrics = data.metrics;
  var contentGroupings = data.contentGroupings;

  var ret = {};

  each([metrics, dimensions, contentGroupings], function(group) {
    each(group, function(prop, key) {
      var value = dot(obj, prop) || obj[prop];
      if (is.bool(value)) value = value.toString();
      if (value || value === 0) ret[key] = value;
    });
  });

  return ret;
}