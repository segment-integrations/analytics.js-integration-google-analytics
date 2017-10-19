'use strict';

/**
 * Module dependencies.
 */

var extend = require('@ndhoule/extend');
var defaults = require('@ndhoule/defaults');
var len = require('object-component').length;
var reject = require('reject');
var metrics = require('./utils').metrics;
var path = require('./utils').path;
var formatValue = require('./utils').formatValue;

/**
 * Initialize.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/advanced
 */

exports.initialize = function() {
  var options = this.options;
  var user = this.analytics.user();

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
    cookieDomain: options.domain || this.prototype.defaults.domain,
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

  // Set trackerName to prototype for easier lookup throughout protoype methods.
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
  window.ga(this._trackerName + 'set', globalOptions);

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
  var custom = metrics(userTraits, options);

  if (len(custom)) window.ga(this._trackerName + 'set', custom);

  this.load('library', this.ready);
};

/**
 * Loaded?
 *
 * @return {Boolean}
 */

exports.loaded = function() {
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

exports.page = function(page) {
  var category = page.category();
  var properties = page.properties();
  var name = page.fullName();
  var options = this.options;

  // categorized pages
  if (category && this.options.trackCategorizedPages) {
    // Store for future availability in .track events on the same page.
    this._category = category;
    this.track(page.track(category), { nonInteraction: 1 });
  }

  var payload = reject({
    title: page.fullName() || properties.title,
    location: !this.pageCalled ? properties.url : null,
    page: path(properties, this.options)
  });

  // custom dimensions, metrics and content groupings
  var custom = metrics(properties, options);

  if (len(custom)) {
    if (options.setAllMappedProps) {
      window.ga(this._trackerName + 'set', custom);
    } else {
      // Add custom dimensions / metrics to pageview payload
      payload = extend(payload, custom);
    }
  }

  // set
  this.setContextParams(page);

  if (this.pageCalled) delete payload.location;

  // send
  window.ga(this._trackerName + 'send', 'pageview', payload);

  // named pages
  if (name && this.options.trackNamedPages) {
    this.track(page.track(name), { nonInteraction: 1 });
  }

  this.pageCalled = true;
};

/**
 * Track.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference
 *
 * @param {Track} event
 */

exports.track = function(track, options) {
  var contextOpts = track.options(this.name);
  var interfaceOpts = this.options;
  options = defaults(defaults(options || {}, contextOpts), interfaceOpts);
  var properties = track.properties();

  var payload = {
    eventAction: track.event(),
    eventCategory: track.category() || this._category || 'All',
    eventLabel: properties.label,
    eventValue: formatValue(properties.value || track.revenue()),
    // Allow users to override their nonInteraction integration setting for any single particluar event.
    nonInteraction: properties.nonInteraction !== undefined ? !!properties.nonInteraction : !!options.nonInteraction
  };

  // custom dimensions & metrics
  var custom = metrics(properties, interfaceOpts);

  if (len(custom)) {
    if (interfaceOpts.setAllMappedProps) {
      window.ga(this._trackerName + 'set', custom);
    } else {
      // Add custom dimensions / metrics to payload
      payload = extend(payload, custom);
    }
  }

  // set
  this.setContextParams(track);

  // send
  window.ga(this._trackerName + 'send', 'event', payload);
};


exports.setContextParams = function(facade) {
  var campaign = facade.proxy('context.campaign') || {};

  // Set Traffic Sources: https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#trafficsources
  // Currently Unsupported: campaignId
  var trafficSources = reject({
    referrer: facade.referrer() !== document.referrer ? facade.referrer() : null,
    campaignName: campaign.name,
    campaignSource: campaign.source,
    campaignMedium: campaign.medium,
    campaignContent: campaign.content,
    campaignKeyword: campaign.term
  });

  window.ga(this._trackerName + 'set', trafficSources);

  // Return out of function if it is a track event. Content data is collected via page events.
  if (facade.type() !== 'page') return;

  var page = facade;
  var properties = page.properties();

  // Set Content Info Fields: https://developers.google.com/analytics/devguides/collection/analyticsjs/pages#pageview_fields
  // Currently Unsupported: linkId
  var contentInfo = reject({
    title: page.fullName() || properties.title,
    page: path(properties, this.options)
  });

  window.ga(this._trackerName + 'set', contentInfo);
}