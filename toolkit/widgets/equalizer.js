 /* toolkit provides different widgets, implements and modules for 
 * building audio based applications in webbrowsers.
 * 
 * Invented 2013 by Markus Schmidt <schmidt@boomshop.net>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General
 * Public License along with this program; if not, write to the
 * Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, 
 * Boston, MA  02110-1301  USA
 */
"use strict";
(function(w){
function invalidate_bands() {
    this.invalid.bands = true;
    this.trigger_draw();
}
w.TK.Equalizer = w.Equalizer = $class({
    /**
     * TK.Equalizer is a TK.ResponseHandler adding some EqBands instead of
     * simple ResponseHandles.
     *
     * @class TK.Equalizer
     * @extends TK.ResponseHandler
     */
    _class: "Equalizer",
    Extends: TK.ResponseHandler,
    _options: Object.assign(Object.create(TK.ResponseHandler.prototype._options), {
        accuracy: "number",
        bands:  "array",
    }),
    options: {
        accuracy: 1, // the distance between points of curves on the x axis
        bands: [],   // list of bands to create on init
    },
    
    initialize: function (options) {
        this.bands = [];
        TK.ResponseHandler.prototype.initialize.call(this, options);
        TK.add_class(this.element, "toolkit-equalizer");
        this._bands = TK.make_svg("g", {"class": "toolkit-eqbands"});
        this.svg.appendChild(this._bands);
            
        this.baseline = this.add_graph({
            range_x:   function () { return this.range_x; }.bind(this),
            range_y:   function () { return this.range_y; }.bind(this),
            container: this._bands,
            dots: [{x: 20, y: 0}, {x: 20000, y: 0}]
        });
        this.add_bands(this.options.bands);
    },
    
    destroy: function () {
        this.empty(); // Arne: ??? <- Markus: removes all graphs, defined in Chart
        this._bands.remove();
        TK.ResponseHandler.prototype.destroy.call(this);
    },
    redraw: function () {
        var I = this.invalid;
        var O = this.options;
        TK.ResponseHandler.prototype.redraw.call(this);
        if (I.validate("bands", "accuracy")) {
            if (this.baseline) {
                var c = 0;
                var end = this.range_x.get("basis") | 0;
                var step = O.accuracy;
                var x_px_to_val = this.range_x.px2val;
                var y_val_to_px = this.range_y.val2px;
                var f = [];
                var y = 0, x = x_px_to_val(0);

                for (var i = 0; i < this.bands.length; i++) {
                    if (this.bands[i].get("active")) {
                        f[c] = this.bands[i].filter.freq2gain;
                        y += f[c](x);
                        c++;
                    }
                }

                var d = new Array(end / step);
                c = 1;

                d[0] = "M0," + y_val_to_px(y).toFixed(1);

                for (var i = 1; i < end; i += step) {
                    x = x_px_to_val(i);
                    y = 0;
                    for (var j = 0; j < f.length; j++) y += f[j](x);

                    d[c ++] = "L" + i + "," + y_val_to_px(y).toFixed(1);
                }
                this.baseline.set("dots", d.join(""));
            }
        }
    },
    resize: function () {
        invalidate_bands.call(this);
        TK.ResponseHandler.prototype.resize.call(this);
    },
    add_band: function (options) {
        var b;
        if (TK.EqBand.prototype.isPrototypeOf(options)) {
          b = options;
        } else {
          options["container"] = this._bands;
          if (typeof options["range_x"] == "undefined")
              options["range_x"] = function () { return this.range_x; }.bind(this);
          if (typeof options["range_y"] == "undefined")
              options["range_y"] = function () { return this.range_y; }.bind(this);
          if (typeof options["range_z"] == "undefined")
              options["range_z"] = function () { return this.range_z; }.bind(this);
          
          options["intersect"] = this.intersect.bind(this);
          b = new TK.EqBand(options);
        }
        
        this.bands.push(b);
        var _mousemove = b._mousemove.bind(b);
        var _mouseup = b._mouseup.bind(b);
        var _touchmove = b._touchmove.bind(b);
        var _touchend = b._touchend.bind(b);
        b.add_events(["handlegrabbed", "zchangestarted"], function () {
            this._active++;
            document.addEventListener("mousemove", _mousemove);
            document.addEventListener("mouseup",   _mouseup);
            document.addEventListener("touchmove", _touchmove);
            document.addEventListener("touchend",  _touchend);
        }.bind(this));
        b.add_events(["handlereleased", "zchangeended"],  function () {
            if (this._active) this._active--;
            document.removeEventListener("mousemove", _mousemove);
            document.removeEventListener("mouseup",   _mouseup);
            document.removeEventListener("touchmove", _touchmove);
            document.removeEventListener("touchend",  _touchend);
        }.bind(this));
        b.add_event("set", invalidate_bands.bind(this)); 
        this.fire_event("bandadded", b);
        this.add_child(b);
        invalidate_bands.call(this);
        return b;
    },
    add_bands: function (bands) {
        for (var i = 0; i < bands.length; i++)
            this.add_band(bands[i]);
    },
    
    remove_band: function (h) {
        for (var i = 0; i < this.bands.length; i++) {
            if (this.bands[i] == h) {
                this.remove_child(h);
                h.destroy();
                this.bands.splice(i, 1);
                this.fire_event("bandremoved");
                break;
            }
        }
    },
    remove_bands: function () {
        for (var i = 0; i < this.bands.length; i++) {
            this.remove_band(this.bands[i]);
        }
        this.bands = [];
        this.fire_event("emptied");
        invalidate_bands.call(this);
    }
});
})(this);
