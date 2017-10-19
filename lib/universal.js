'use strict';

/**
 * Module dependencies.
 */

var defaults = require('@ndhoule/defaults');
var each = require('component-each');
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
  each(globalOptions, function(key, value) {
    window.ga(this._trackerName + 'set', key, value);
  }.bind(this));

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
