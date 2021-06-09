/*
 * This file is part of AUX.
 *
 * AUX is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * AUX is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General
 * Public License along with this program; if not, write to the
 * Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
 * Boston, MA  02110-1301  USA
 */

import { defineClass } from './../widget_helpers.js';
import { addClass } from '../utils/dom.js';
import { warn } from '../utils/log.js';
import { FrequencyResponse } from './frequencyresponse.js';
import { EqBand } from './eqband.js';
import { Graph } from './graph.js';
import { inheritChildOptions } from '../child_widget.js';

function fastDrawPLinear(X, Y) {
  var ret = [];
  var i,
    len = X.length;
  var dy = 0,
    x,
    y,
    tmp;

  var accuracy = 20;
  var c = 0;

  if (len < 2) return '';

  x = +X[0];
  y = +Y[0];

  ret.push('M', x.toFixed(2), ',', y.toFixed(2));

  x = +X[1];
  y = +Y[1];

  dy = ((y - Y[0]) * accuracy) | 0;

  for (i = 2; i < len; i++) {
    tmp = ((Y[i] - y) * accuracy) | 0;
    if (tmp !== dy) {
      ret.push('L', x.toFixed(2), ',', y.toFixed(2));
      dy = tmp;
      c++;
    }
    x = +X[i];
    y = +Y[i];
  }

  ret.push('L', x.toFixed(2), ',', y.toFixed(2));

  return ret.join('');
}
function drawGraph(bands) {
  var O = this.options;
  var c = 0;
  var end = this.range_x.get('basis') | 0;
  var step = O.accuracy;
  var over = O.oversampling;
  var thres = O.threshold;
  var x_px_to_val = this.range_x.pixelToValue.bind(this.range_x);
  var y_val_to_px = this.range_y.valueToPixel.bind(this.range_y);
  var i, j, k;
  var x, y;
  var pursue;

  var X = new Array(end / step + 4);
  X[0] = -10;
  X[1] = -10;
  for (i = 2; i < X.length - 2; i++) {
    X[i] = c;
    c += step;
  }
  X[X.length - 2] = end + 10;
  X[X.length - 1] = end + 10;

  var Y = new Array(end / step + 4);
  Y[0] = y_val_to_px(0);
  Y[Y.length - 1] = y_val_to_px(0);

  for (i = 2; i < X.length - 2; i++) {
    x = x_px_to_val(X[i]);
    y = 0.0;
    for (j = 0; j < bands.length; j++) y += bands[j](x);
    Y[i] = y_val_to_px(y);
    let diff = Math.abs(Y[i] - Y[i - 1]) >= thres;
    if (i && over > 1 && (diff || pursue)) {
      if (diff) pursue = true;
      else if (!diff && pursue) pursue = false;
      for (k = 1; k < over; k++) {
        x = X[i - k] + (step / over) * k;
        X.splice(i, 0, x);
        x = x_px_to_val(x);
        y = 0.0;
        for (j = 0; j < bands.length; j++) y += bands[j](x);
        Y.splice(i, 0, y_val_to_px(y));
        i++;
      }
    }

    Y[1] = Y[2];
    Y[Y.length - 2] = Y[Y.length - 3];

    if (!isFinite(Y[i])) {
      warn('Singular filter in Equalizer.');
      return void 0;
    }
  }

  return fastDrawPLinear(X, Y);
}
function invalidateBands() {
  this.invalid.bands = true;
  this.triggerDraw();
}

export const EqualizerGraph = defineClass({
  /**
   * EqualizerGraph is a special {@link Graph}, which contains a list of {@link EqBand}s and draws the
   * resulting frequency response curve.
   *
   * @property {Number} [options.accuracy=1] - The distance between points on
   *   the x axis. Reduces CPU load in favour of accuracy and smoothness.
   * @property {Array} [options.bands=[]] - The list of {@link EqBand}s.
   * @property {Number} [options.oversampling=5] - If slope of the curve is too
   *   steep, oversample n times in order to not miss e.g. notch filters.
   * @property {Number} [options.threshold=5] - Steepness of slope to oversample,
   *   i.e. y pixels difference per x pixel
   * @property {Function} [options.rendering_filter=(b) => b.get('active')] - A
   *   callback function which can be used to customize which equalizer bands
   *   are included when rendering the frequency response curve. This defaults
   *   to those bands which have their `active` option set to `true`.
   * @class EqualizerGraph
   *
   * @extends Graph
   */
  Extends: Graph,
  _options: Object.assign(Object.create(Graph.prototype._options), {
    accuracy: 'number',
    oversampling: 'number',
    threshold: 'number',
    bands: 'array',
    rendering_filter: 'function',
  }),
  options: {
    accuracy: 1, // the distance between points of curves on the x axis
    oversampling: 4, // if slope of the curve is too steep, oversample
    // n times in order to not miss a notch filter
    threshold: 10, // steepness of slope, i.e. amount of y pixels difference
    bands: [], // list of bands to create on init
    rendering_filter: function (band) {
      return band.get('active');
    },
  },
  initialize: function (options) {
    Graph.prototype.initialize.call(this, options);
    this._invalidate_bands = invalidateBands.bind(this);
  },
  redraw: function () {
    var I = this.invalid;
    if (
      I.validate(
        'bands',
        'accuracy',
        'rendering_filter',
        'oversampling',
        'threshold'
      )
    ) {
      this.set('dots', this.drawPath());
    }
    Graph.prototype.redraw.call(this);
  },
  /**
   * Returns the functions representing the frequency response of all
   * active filters.
   */
  getFilterFunctions: function () {
    var bands = this.options.bands.filter(this.options.rendering_filter);
    return bands.map((b) => b.filter.getFrequencyToGain());
  },
  /**
   * Draws an SVG path for the current frequency response curve.
   */
  drawPath: function () {
    return drawGraph.call(this, this.getFilterFunctions());
  },
  resize: function () {
    invalidateBands.call(this);
  },
  addBand: function (band) {
    band.on('set', this._invalidate_bands);
    this.set('bands', this.options.bands.concat([band]));
  },
  removeBand: function (band) {
    var O = this.options;
    this.set(
      'bands',
      O.bands.filter(function (b) {
        return b !== band;
      })
    );
    band.off('set', this._invalidate_bands);
  },
});

export const Equalizer = defineClass({
  /**
   * Equalizer is a {@link FrequencyResponse}, utilizing {@link EqBand}s instead of
   * simple {@link ChartHandle}s. An Equalizer - by default - has one
   * {@link EqualizerGraph} which contains all bands. Additional {@link
   * EqualizerGraph}s can be added. The Equalizer inherits all options of
   * {@link EqualizerGraph}.
   *
   * @property {Boolean} [options.show_bands=true] - Show or hide all bands.
   *
   * @class Equalizer
   *
   * @extends FrequencyResponse
   */
  Extends: FrequencyResponse,
  _options: Object.assign(Object.create(FrequencyResponse.prototype._options), {
    show_bands: 'boolean',
  }),
  options: {
    show_bands: true,
  },
  static_events: {
    set_bands: function (value) {
      if (this.bands.length) this.removeBands();
      this.addBands(value);
    },
    set_show_bands: function (value) {
      this.set('show_handles', value);
    },
  },

  initialize: function (options) {
    FrequencyResponse.prototype.initialize.call(this, options);
    /**
     * @member {Array} Equalizer#bands - Array of {@link EqBand} instances.
     */
    this.bands = this.handles;

    /**
     * @member {HTMLDivElement} Equalizer#element - The main DIV container.
     *   Has class <code>.aux-equalizer</code>.
     */

    /**
     * @member {SVGGroup} Equalizer#_bands - The SVG group containing all the bands SVG elements.
     *   Has class <code>.aux-eqbands</code>.
     */
    this._bands = this._handles;
    addClass(this._bands, 'aux-eqbands');

    /**
     * @member {Graph} Equalizer#baseline - The graph drawing the zero line.
     *   Has class <code>.aux-baseline</code>
     */
    this.baseline = new EqualizerGraph({
      range_x: this.range_x,
      range_y: this.range_y,
      class: 'aux-baseline',
    });
    this.addGraph(this.baseline);
    this.addBands(this.options.bands);
  },

  destroy: function () {
    this.empty();
    this._bands.remove();
    FrequencyResponse.prototype.destroy.call(this);
  },
  draw: function (O, element) {
    addClass(element, 'aux-equalizer');

    FrequencyResponse.prototype.draw.call(this, O, element);
  },
  /**
   * Add a new band to the equalizer. Options is an object containing
   * options for the {@link EqBand}
   *
   * @method Equalizer#addBand
   *
   * @param {Object} [options={ }] - An object containing initial options for the {@link EqBand}.
   * @param {Object} [type=EqBand] - A widget class to be used for the new band.
   *
   * @emits Equalizer#bandadded
   */
  addChild: function (child) {
    FrequencyResponse.prototype.addChild.call(this, child);

    if (child instanceof EqBand) {
      /**
       * Is fired when a new band was added.
       *
       * @event Equalizer#bandadded
       *
       * @param {EqBand} band - The {@link EqBand} which was added.
       */
      this.emit('bandadded', child);
      this.baseline.addBand(child);
    }
  },
  removeChild: function (child) {
    if (child instanceof EqBand) {
      /**
       * Is fired when a band was removed.
       *
       * @event Equalizer#bandremoved
       *
       * @param {EqBand} band - The {@link EqBand} which was removed.
       */
      this.emit('bandremoved', child);
      this.baseline.removeBand(child);
    }

    FrequencyResponse.prototype.removeChild.call(this, child);
  },
  addBand: function (options, type) {
    let b;

    if (options instanceof EqBand) {
      b = options;
    } else {
      type = type || EqBand;
      b = new type(options);
    }

    this.addChild(b);

    return b;
  },
  /**
   * Add multiple new {@link EqBand}s to the equalizer. Options is an array
   * of objects containing options for the new instances of {@link EqBand}
   *
   * @method Equalizer#addBands
   *
   * @param {Array<Object>} options - An array of options objects for the {@link EqBand}.
   * @param {Object} [type=EqBand] - A widget class to be used for the new band.
   */
  addBands: function (bands, type) {
    for (var i = 0; i < bands.length; i++) this.addBand(bands[i], type);
  },
  /**
   * Remove a band from the widget.
   *
   * @method Equalizer#removeBand
   *
   * @param {EqBand} band - The {@link EqBand} to remove.
   *
   * @emits Equalizer#bandremoved
   */
  removeBand: function (h) {
    this.removeChild(h);
  },
  /**
   * Remove multiple {@link EqBand} from the equalizer. Options is an array
   * of {@link EqBand} instances.
   *
   * @method Equalizer#removeBands
   *
   * @param {Array<EqBand>} bands - An array of {@link EqBand} instances.
   */
  removeBands: function (bands) {
    if (!bands) bands = this.bands.slice(0);

    for (let i = 0; i < bands.length; i++) this.removeBand(bands[i]);
    /**
     * Is fired when all bands are removed.
     *
     * @event Equalizer#emptied
     */
    if (!bands) this.emit('emptied');
  },
});

inheritChildOptions(Equalizer, 'baseline', EqualizerGraph);
