'use strict';

/**
 * Module dependencies.
 */

var each = require('component-each');
var reject = require('reject');
var createProductTrack = require('./utils').createProductTrack;

/**
 * Loads ec.js (unless already loaded)
 *
 * @param {Track} track
 */

exports.loadEnhancedEcommerce = function(track) {
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

exports.pushEnhancedEcommerce = function(track) {
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

exports.checkoutStarted = function(track) {
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

exports.orderUpdated = function(track) {
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

exports.checkoutStepViewed = function(track) {
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

exports.checkoutStepCompleted = function(track) {
  // We require a step and option property to send a checkoutStepCompleted event.
  // TODO: why?
  if (!track.proxy('properties.step') || !track.proxy('properties.paymentMethod') && !track.proxy('properties.shippingMethod')) return;

  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:setAction', 'checkout_option', buildActionFieldObject(track, 'checkout_option'));

  window.ga(this._trackerName + 'send', 'event', 'Checkout', 'Option');
};

/**
 * Completed order - Enhanced Ecommerce
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-transactions
 *
 * @api private
 * @param {Track} track
 */

exports.orderCompleted = function(track) {
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

exports.orderRefunded = function(track) {
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

exports.productAdded = function(track) {
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

exports.productRemoved = function(track) {
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

exports.productViewed = function(track) {
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

exports.productClicked = function(track) {
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

exports.promotionViewed = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addPromo', buildPromoFieldObject(track));

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

exports.promotionClicked = function(track) {
  this.loadEnhancedEcommerce(track);

  window.ga(this._trackerName + 'ec:addPromo', buildPromoFieldObject(track));

  window.ga(this._trackerName + 'ec:setAction', 'promo_click', {});

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

exports.productListViewed = function(track) {
  var products = track.products();
  var self = this;

  this.loadEnhancedEcommerce(track);

  each(products, function(product, index) {
    product = createProductTrack(track, product);
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

exports.productListFiltered = function(track) {
  var props = track.properties();
  var products = track.products();
  props.filters = props.filters || [];
  props.sorters = props.sorters || [];
  var filters = props.filters.map(function(obj) { return obj.type + ':' + obj.value;}).join();
  var sorts = props.sorts.map(function(obj) { return obj.type + ':' + obj.value;}).join();
  var self = this;

  this.loadEnhancedEcommerce(track);
  each(products, function(product, index) {
    product = createProductTrack(track, product);
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
    track.proxy('properties.paymentMethod'),
    track.proxy('properties.shippingMethod')
  ];

  // Remove all nulls, and join with commas.
  var valid = reject(options);
  return valid.length > 0 ? valid.join(', ') : null;
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
    coupon: product.coupon()
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
  if ((actionType === 'purchase' || actionType === 'refund') && !track.orderId()) return;

  var payload = {
    id: track.orderId(),
    affiliation: properties.affiliation,
    revenue: track.revenue(),
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

  // Need this to support backwards comptibility with some legacy behavior where we defaulted to 0 for Order Completed events.
  if (payload.revenue == null && track.event().toLowerCase() === 'order completed') payload.revenue = 0;

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