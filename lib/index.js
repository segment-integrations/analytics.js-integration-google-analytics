'use strict';

/**
 * Module dependencies.
 */

var integration = require('@segment/analytics.js-integration');
var Track = require('segmentio-facade').Track;

/**
 * Expose `Oiq` integration.
 *
 */
var Oiq = module.exports = integration('Oiq')
  .assumesPageview()
  .global('_oiqq')
  .option('data_group_id','')
  .option('tag_id','');

Oiq.prototype.initialize = function() {
  var opts = this.options;
  var oiq = document.createElement('script'); oiq.type = 'text/javascript'; oiq.async = true;
  oiq.src = document.location.protocol + '//px.owneriq.net/stas/s/'+opts.data_group_id+'.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(oiq, s);

  window._oiqq = window._oiqq || [];
  this.load(this.ready);
};

/**
 * Loaded?
 *
 * @return {Boolean}
 */
Oiq.prototype.loaded = function() {
  return !!window._oiqq;
};

/**
 * Page.
 *
 * @param {Page} page
 */

Oiq.prototype.page = function() {
  var opts = this.options;
  window._oiqq = window._oiqq || [];
  window._oiqq.push(['oiq_addPageLifecycle', opts.data_group_id]);
  window._oiqq.push(['oiq_doTag']);
};

/**
 * Order completed.
 *
 * @param {Track} track
 */

Oiq.prototype.orderCompleted = function(track) {
  var title=document&&document.title||'Default Conversion - do not edit';
  var total = track.total() || track.revenue() || 0;
  var tax = track.tax() || 0;
  var orderId = track.orderId();
  var products = track.products();
  var email = track.email();
  var customerId = track.username();
  var opts = this.options;

  var oiq_conv = document.createElement('script');
  oiq_conv.type = 'text/javascript'; oiq_conv.async = true;
  oiq_conv.src = 'https://px.owneriq.net/j?pt='+opts.data_group_id+'&s='+opts.tag_id+'&sConvTitle='+title+'&cnv=true';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(oiq_conv, s);

  // orderId is required.
  if (!orderId) return;

  var totalQuantity=0;
  for (var i=0; i<products.length; i++) {
    var product=products[i];
    var index=i+1;
    var productTrack = createProductTrack(track, product);
    window._oiqq.push(['oiq_addPageLifecycle', opts.tag_id]);
    window._oiqq.push(['oiq_addCustomKVP',['brand_'+index,productTrack.brand()]]);
    // window._oiqq.push(['oiq_addCustomKVP',['google_product_category_'+index,'value']]);
    // window._oiqq.push(['oiq_addCustomKVP',['gtin_'+index,'value']]);
    window._oiqq.push(['oiq_addCustomKVP',['id_'+index,productTrack.sku()]]);
    window._oiqq.push(['oiq_addCustomKVP',['price_'+index,productTrack.price()]]);
    window._oiqq.push(['oiq_addCustomKVP',['product_type_'+index,productTrack.category()]]);
    window._oiqq.push(['oiq_addCustomKVP',['quantity_'+index,productTrack.quantity()]]);
    window._oiqq.push(['oiq_addCustomKVP',['title_'+index,productTrack.name()]]);
    totalQuantity += productTrack.quantity()||0;
  }
  window._oiqq.push(['oiq_addCustomKVP',['order_id',orderId]]);
  // window._oiqq.push(['oiq_addCustomKVP',['cc_type','value']]);
  window._oiqq.push(['oiq_addCustomKVP',['customer_id',customerId]]);
  window._oiqq.push(['oiq_addCustomKVP',['email',email]]);
  window._oiqq.push(['oiq_addCustomKVP',['total_cost_notax',total]]);
  window._oiqq.push(['oiq_addCustomKVP',['total_cost_tax',total+tax]]);
  window._oiqq.push(['oiq_addCustomKVP',['total_quantity',totalQuantity]]);
  window._oiqq.push(['oiq_doTag']);
};


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
