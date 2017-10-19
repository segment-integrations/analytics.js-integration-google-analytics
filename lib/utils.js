'use strict';

/**
 * Module dependencies.
 */

var Track = require('segmentio-facade').Track;
var each = require('component-each');
var dot = require('obj-case');
var is = require('is');

/**
 * Return the path based on `properties` and `options`.
 *
 * @param {Object} properties
 * @param {Object} options
 * @return {string|undefined}
 */

exports.path = function(properties, options) {
  if (!properties) return;
  var str = properties.path;
  if (options.includeSearch && properties.search) str += properties.search;
  return str;
};

/**
 * Format the value property to Google's liking.
 *
 * @param {Number} value
 * @return {Number}
 */

exports.formatValue = function(value) {
  if (!value || value < 0) return 0;
  return Math.round(value);
};

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

exports.metrics = function(obj, data) {
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
};

/**
 * Creates a track out of product properties.
 *
 * @api private
 * @param {Track} track
 * @param {Object} properties
 * @return {Track}
 */

exports.createProductTrack = function(track, properties) {
  properties.currency = properties.currency || track.currency();
  return new Track({ properties: properties });
};