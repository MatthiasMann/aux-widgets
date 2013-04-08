ResponseHandle = new Class({
    Extends: Coordinates,
    Implements: [Options, Events],
    options: {
        "class":          "",
        id:               "",
        container:        false,        // a container to use as the base object
        intersect:        false,        // callback function for checking intersections: function (x1, y1, x2, y2) {}
                                        // returns a value describing the amount of intersection with other handle elements.
                                        // intersections are weighted depending on the intersecting object. E.g. SVG borders have
                                        // a very high impact while intersecting in comparison with overlapping handle objects
                                        // that have a low impact on intersection
        mode:             _TOOLKIT_CIRCULAR, // mode of the handle:
                                        // _TOOLKIT_CIRCULAR: circular handle
                                        // _TOOLKIT_LINE_VERTICAL: x movement, line handle vertical
                                        // _TOOLKIT_LINE_HORIZONTAL: y movement, line handle horizontal
                                        // _TOOLKIT_BLOCK_LEFT: x movement, block lefthand
                                        // _TOOLKIT_BLOCK_RIGHT: x movement, block righthand
                                        // _TOOLKIT_BLOCK_TOP: y movement, block on top
                                        // _TOOLKIT_BLOCK_RIGHT: y movement, block on bottom
        preferences:     [_TOOLKIT_LEFT, _TOOLKIT_TOP, _TOOLKIT_RIGHT, _TOOLKIT_BOTTOM], // perferred position of the label
        label:            function (title, x, y, z) { return sprintf("%s\n%d Hz\n%.2f dB\nQ: %.2f", title, x, y, z); },
        x:                0,            // value for the x position depending on mode_x
        y:                0,            // value for y position depending on mode_y
        z:                0,            // value for the scale depending on mode_z
        x_min:            false,        // restrict x movement, min x value, false to disable
        x_max:            false,        // restrict x movement, max x value, false to disable
        y_min:            false,        // restrict y movement, min y value, false to disable
        y_max:            false,        // restrict y movement, max y value, false to disable
        z_min:            false,        // restrict z values, min z value, false to disable
        z_max:            false,        // restrict z values, max z value, false to disable
        min_size:         16,           // minimum size of object in pixels, values can be smaller
        margin:           3,            // margin between label and handle
        gesture_distance: 10,           // pixels to move while touchmove for setting 1 step
        active:           function(){return true} // callback that returns true if handle is usable and false if not
    },
    
    x: 0,
    y: 0,
    z: 0,
    label:  {x:0, y: 0, width: 0, height:0},
    handle: {x:0, y: 0, width: 0, height:0},
    __active: false,
    _add: .5,
    _tdist: false,
    
    initialize: function (options, hold) {
        this.setOptions(options);
        this.parent(options);
        if(!this.options.id) this.options.id = String.uniqueID();
        if (Browser.firefox)
            this._add = 0;
        var cls = "toolkit-response-handle ";
        switch(this.options.mode) {
            case _TOOLKIT_CIRCULAR:        cls += "toolkit-circular";        break;
            case _TOOLKIT_LINE_VERTICAL:   cls += "toolkit-line-vertical";   break;
            case _TOOLKIT_LINE_HORIZONTAL: cls += "toolkit-line-horizontal"; break;
            case _TOOLKIT_BLOCK_LEFT:      cls += "toolkit-block-left";      break;
            case _TOOLKIT_BLOCK_RIGHT:     cls += "toolkit-block-right";     break;
            case _TOOLKIT_BLOCK_TOP:       cls += "toolkit-block-top";       break;
            case _TOOLKIT_BLOCK_BOTTOM:    cls += "toolkit-block-bottom";    break;
        }
        this.element = makeSVG("g", {
            "id":    this.options.id,
            "class": cls
        });
        this.element.addClass(cls);
        
        this._label = makeSVG("text", {
            "class": "toolkit-label"
        }).inject(this.element);
        
        this._lineH = makeSVG("path", {
            "class": "toolkit-line toolkit-horizontal"
        }).inject(this.element);
        this._lineV = makeSVG("path", {
            "class": "toolkit-line toolkit-vertical"
        }).inject(this.element);
        
        this._handle = makeSVG(this.options.mode == _TOOLKIT_CIRCULAR ? "circle" : "rect", {
            "class": "toolkit-handle"
        }).inject(this.element);
        
        var opts = {}
        switch(this.options.mode) {
            case _TOOLKIT_BLOCK_LEFT:
            case _TOOLKIT_BLOCK_RIGHT:
                opts = {x1: "0%", y1: "0%", x2: "0%", y2: "100%"}; break;
            case _TOOLKIT_BLOCK_TOP:
            case _TOOLKIT_BLOCK_BOTTOM:
                opts = {x1: "0%", y1: "0%", x2: "0%", y2: "100%"}; break;
        }
        opts["id"] = "grad_" + this.options.id;
        this._gradient = makeSVG("linearGradient", opts).inject(this.element);
        this._stop1 = makeSVG("stop", {
            "offset": "0%",
            "stop-color": ""
        }).inject(this._gradient);
        this._stop2 = makeSVG("stop", {
            "offset": "100%",
            "stop-color": ""
        }).inject(this._gradient);
        
        if(this.options.container) this.set("container", this.options.container, hold);
        if(this.options["class"]) this.set("class", this.options["class"], hold);
        this.element.addEvents({
            "mouseenter":  function(e){this.element.addClass("toolkit-hover");}.bind(this),
            "mouseleave":  function(e){this.element.removeClass("toolkit-hover");}.bind(this),
            "mousedown":   this._mousedown.bind(this),
//             "mouseup":     this._mouseup.bind(this),
            "touchstart":  this._touchstart.bind(this),
//             "touchend":    this._touchend.bind(this)
        });
        this._label.addEvents({
            "mouseenter":  function () { if(this.options.container) this.element.inject(this.options.container) }.bind(this),
            "touchstart":  function () { if(this.options.container) this.element.inject(this.options.container) }.bind(this),
            "mousewheel":  this._scrollwheel.bind(this),
            "contextmenu": function(){return false;}
        });
        this._handle.addEvents({
            "mouseenter":  function () { if(this.options.container) this.element.inject(this.options.container) }.bind(this),
            "touchstart":  function () { if(this.options.container) this.element.inject(this.options.container) }.bind(this),
            "mousewheel":  this._scrollwheel.bind(this),
            "contextmenu": function(){return false;}
        });
        
        this._handle.onselectstart = function () { return false; };
        if(!hold) this.redraw();
    },
    
    redraw: function () {
        var x      = 0;
        var y      = 0;
        var width  = 0;
        var height = 0;
        var m      = this.options.margin;
        
        // do we have to restrict movement?
        if(this.options.x_min !== false)
            this.options.x = Math.max(this.options.x_min, this.options.x);
        if(this.options.x_max !== false)
            this.options.x = Math.min(this.options.x_max, this.options.x);
        if(this.options.y_min !== false)
            this.options.y = Math.max(this.options.y_min, this.options.y);
        if(this.options.y_max !== false)
            this.options.y = Math.min(this.options.y_max, this.options.y);
        if(this.options.z_min !== false)
            this.options.z = Math.max(this.options.z_min, this.options.z);
        if(this.options.z_max !== false)
            this.options.z = Math.min(this.options.z_max, this.options.z);
        
        this.x = Math.round(this.x2px(this.options.x));
        this.y = Math.round(this.y2px(this.options.y));
        this.z = Math.round(this.z2px(this.options.z));
        
        // ELEMENT / HANDLE
        switch(this.options.mode) {
            case _TOOLKIT_CIRCULAR:
                // circle
                x      = this.x;
                y      = this.y;
                width  = Math.max(this.options.min_size, this.z);
                height = width;
                this._handle.set("r", width / 2);
                this.element.set({transform: "translate(" + x + "," + y + ")"});
                this.handle = {x1: x - width / 2, y1: y - width / 2, x2: x + width / 2, y2: y + height / 2}
                break;
            case _TOOLKIT_LINE_VERTICAL:
                // line vertical
                x      = Math.min(this.options.width - this.options.min_size, Math.max(0, this.x2px(this.options.x) - this.options.min_size / 2));
                y      = 0;
                width  = this.options.min_size;
                height = this.options.height;
                this._handle.set({x:x,y:y,width:width, height:height});
                this.element.set({transform: "translate(0,0)"});
                break;
            case _TOOLKIT_LINE_HORIZONTAL:
                // line horizontal
                x      = 0;
                y      = Math.min(this.options.height - this.options.min_size, Math.max(0, this.y2px(this.options.y) - this.options.min_size / 2));
                width  = this.options.width;
                height = this.options.min_size;
                break;
            case _TOOLKIT_BLOCK_LEFT:
                // rect lefthand
                x      = 0;
                y      = 0;
                width  = Math.max(this.options.min_size, this.x2px(this.options.x));
                height = this.options.height;
                break;
            case _TOOLKIT_BLOCK_RIGHT:
                // rect righthand
                x      = Math.max(this.options.min_size, this.x2px(this.options.x));
                y      = 0;
                width  = this.options.width - x;
                height = this.options.height;
                break;
            case _TOOLKIT_BLOCK_TOP:
                // rect top
                x      = 0;
                y      = 0;
                width  = this.options.width;
                height = Math.max(this.options.min_size, this.y2px(this.options.y));
                break;
            case _TOOLKIT_BLOCK_BOTTOM:
                // rect bottom
                x      = 0;
                y      = Math.max(this.options.min_size, this.y2px(this.options.y));
                width  = this.options.width;
                height = this.options.height - y;
                break;
        }
        
        // LABEL
        this._label.empty();
        var t = this.options.label(this.options.title, this.options.x, this.options.y, this.options.z);
        var a = t.split("\n");
        for(var i = 0; i < a.length; i++) {
            var l = makeSVG("tspan").inject(this._label);
            l.set("text", a[i]);
            l.set({x:0, dy:"1.0em"});
        }
        this._label.set("html", t);
        
        switch(this.options.mode) {
            case _TOOLKIT_CIRCULAR:
                // circles
                var intersects = [];
                var pos = false;
                var align = "";
                var _s = this._label.getSize();
                for(var i = 0; i < this.options.preferences.length; i++) {
                    switch(this.options.preferences[i]) {
                        case _TOOLKIT_TOP:
                            var x1 = x - _s.x / 2;
                            var y1 = y - height / 2 - m - _s.y;
                            var xl = x;
                            var yl = y1;
                            var align = "middle";
                            break;
                        case _TOOLKIT_RIGHT:
                            var x1 = x + width / 2 + m;
                            var y1 = y - _s.y / 2;
                            var xl = x1;
                            var yl = y1;
                            var align = "start";
                            break;
                        case _TOOLKIT_BOTTOM:
                            var x1 = x - _s.x / 2;
                            var y1 = y + height / 2 + m;
                            var xl = x;
                            var yl = y1;
                            var align = "middle";
                            break;
                        case _TOOLKIT_LEFT:
                            var x1 = x - width / 2 - m - _s.x;
                            var y1 = y - _s.y / 2;
                            var xl = x1 + _s.x;
                            var yl = y1;
                            var align = "end";
                            break;
                    }
                    var x2 = x1 + _s.x;
                    var y2 = y1 + _s.y;
                    intersects[i] = this.options.intersect(x1, y1, x2, y2, this.options.id);
                    intersects[i].x1 = x1;
                    intersects[i].y1 = y1;
                    intersects[i].x2 = x2;
                    intersects[i].y2 = y2;
                    intersects[i].xl = xl;
                    intersects[i].yl = yl;
                    intersects[i].align = align
                    if(!intersects[i].intersect) {
                        pos = intersects[i];
                        break;
                    }
                }
                if(pos === false) pos = intersects.sort(function (a, b) {return a.intersect - b.intersect})[0];
                this._label.set({
                    "y": pos.yl - y,
                    "text-anchor": pos.align
                });
                this._label.getChildren().set({
                    "x": pos.xl - x
                });
                this.label = {x1: pos.x1, y1: pos.y1, x2: pos.x2, y2: pos.y2};
                break;
            case _TOOLKIT_LINE_VERTICAL:
                // line vertical
                
                break;
            case _TOOLKIT_LINE_HORIZONTAL:
                // line horizontal
                break;
            case _TOOLKIT_BLOCK_LEFT:
                // rect lefthand
                break;
            case _TOOLKIT_BLOCK_RIGHT:
                // rect righthand
                break;
            case _TOOLKIT_BLOCK_TOP:
                // rect top
                break;
            case _TOOLKIT_BLOCK_BOTTOM:
                // rect bottom
                break;
        }
        
        // LINES
        switch(this.options.mode) {
            case _TOOLKIT_CIRCULAR:
                // circle
                var _x = Math.max(width / 2 + this.options.margin, this.label.x2 - this.x + this.options.margin);
                var _y = Math.max(height / 2 + this.options.margin, this.label.y2 - this.y + this.options.margin);
                this._lineH.set("d", "M" + _x + " 0" + this._add + " L" + (this.options.width - (x - _x)) + " 0" + this._add);
                this._lineV.set("d", "M 0" + this._add + " " + _y + " L 0" + this._add + " " + (this.options.height - (y - _y)));
                break;
            case _TOOLKIT_LINE_VERTICAL:
                // line vertical
                break;
            case _TOOLKIT_LINE_HORIZONTAL:
                // line horizontal
                break;
            case _TOOLKIT_BLOCK_LEFT:
                // rect lefthand
                break;
            case _TOOLKIT_BLOCK_RIGHT:
                // rect righthand
                break;
            case _TOOLKIT_BLOCK_TOP:
                // rect top
                break;
            case _TOOLKIT_BLOCK_BOTTOM:
                // rect bottom
                break;
        }
    },
    destroy: function () {
        this._lineX.destroy();
        this._lineY.destroy();
        this._label.destroy();
        this._handle.destroy();
        this.element.destroy();
    },
    // HELPERS & STUFF
    
    // CALLBACKS / EVENT HANDLING
    _mousedown: function (e) {
        e.event.preventDefault();
        e.event.stopPropagation();
        if(!this.options.active()) return false;
        
        // order
        if(this.options.container) {
            if(e.rightClick) {
                this.element.inject(this.options.container, "top");
                return false;
            } else {
                this.element.inject(this.options.container);
            }
        }
        
        // touch
        if(e.touches && e.touches.length > 1) {
            var ev = e.touches[0];
        } else {
            ev = e.event;
        }
        
        // classes and stuff
        this.element.addClass("toolkit-active");
        this.element.getParent().getParent().addClass("toolkit-dragging");
        this.__active = true;
        this._offsetX = ev.pageX - this.x;
        this._offsetY = ev.pageY - this.y;
        this._clickX  = this.x;
        this._clickY  = this.y;
        this.redraw();
        this.fireEvent("startdrag", {x: this.options.x, y:this.options.y, pos_x:this.x, pos_y:this.y});
        return false;
    },
    _mouseup: function (e) {
        this.__active = false;
        this.element.removeClass("toolkit-active");
        this.element.getParent().getParent().removeClass("toolkit-dragging");
        e.event.preventDefault();
        e.stopPropagation();
        this.fireEvent("stopdrag", {x: this.options.x, y:this.options.y, pos_x:this.x, pos_y:this.y});
    },
    _mousemove: function (e) {
        if(!this.__active) return;
        if(e.touches && e.touches.length > 1) {
            var ev = e.touches[0];
        } else {
            var ev = e.event;
        }
        var mx = my = 1;
        if(e.control && e.shift) {
            mx = this.options.ctrl_x;
            my = this.options.ctrl_y;
        } else if(e.shift) {
            mx = this.options.shift_x;
            my = this.options.shift_y;
        }
        this.set("x", this.px2x(this._clickX + ((ev.pageX - this._offsetX) - this._clickX) * mx));
        this.set("y", this.px2y(this._clickY + ((ev.pageY - this._offsetY) - this._clickY) * my));
        e.event.preventDefault();
        e.stopPropagation();
        this.fireEvent("dragging", {x: this.options.x, y:this.options.y, pos_x:this.x, pos_y:this.y});
    },
    _scrollwheel: function (e) {
        if(this.__sto) window.clearTimeout(this.__sto);
        this.element.addClass("toolkit-active");
        this.__sto = window.setTimeout(function(){this.element.removeClass("toolkit-active")}.bind(this), 250);
        e.event.preventDefault();
        e.event.stopPropagation();
        var s = this.options.step_z * e.wheel;
        if(e.control && e.shift)
            s *= this.options.ctrl_z;
        else if(e.shift)
            s *= this.options.shift_z;
        this.set("z", Math.max(Math.min(this.get("z") + s, this.options.max_z), this.options.min_z));
    },
    _touchstart: function (e) {
        if(e.touches && e.touches.length == 2) {
            e.event.preventDefault();
            e.stopPropagation();
            return false;
        } else {
            this._mousedown(e);
        }
    },
    _touchend: function (e) {
        this._tdist = false;
        if(e.touches && e.touches.length >= 1) {
            e.event.preventDefault();
            e.stopPropagation();
            return false;
        } else {
            this._mouseup(e);
        }
    },
    _touchmove: function (e) {
        if(!this.__active) return;
        if(e.event.touches && e.event.touches.length > 1 && this._tdist === false) {
            var x = e.event.touches[1].pageX - (this.x + this._offsetX);
            var y = e.event.touches[1].pageY - (this.y + this._offsetY);
            this._tdist = Math.sqrt(y*y + x*x);
            this.__z = this.options.z;
        }
        this._label.set("text", e.event.touches.length);
        if(e.event.touches && e.event.touches.length >= 2) {
            var x = e.event.touches[1].pageX - (this.x + this._offsetX);
            var y = e.event.touches[1].pageY - (this.y + this._offsetY);
            var tdist = Math.sqrt(y*y + x*x);
            var z = Math.min(this.__z * (tdist / this._tdist));
            this.set("z", Math.max(Math.min(z, this.options.max_z), this.options.min_z));
            e.event.preventDefault();
            e.event.stopPropagation();
            return false;
        } else {
            this._mousemove(e);
        }
    },
    
    // GETTER & SETTER
    set: function (key, value, hold) {
        this.parent(key, value, hold);
        this.options[key] = value;
        switch(key) {
            default:
                if(!hold) this.redraw();
                break;
            case "container":
                if(!hold) this.element.inject(value, "top");
                break;
            case "class":
                if(!hold) this.element.addClass(value);
                break;
        }
    },
    get: function (key) {
        if(typeof this.options[key] != "undefined")
            return this.options[key];
    }
});
 
