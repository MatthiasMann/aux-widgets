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

import { defineClass } from '../widget_helpers.js';
import { Widget } from './widget.js';
import { TagNode } from './tagnode.js';
import { ColorPickerDialog } from './colorpickerdialog.js';
import { RGBToGray, hexToRGB } from '../utils/colors.js';

function remove(e, node) {
  this.emit('remove', node);
  if (!this.options.async) this.removeNode(node);
}

function colorize(e) {
  const that = this;
  const c = new ColorPickerDialog({
    autoclose: true,
    hex: this.options.color,
    onapply: function (rgb, hsl, hex) {
      if (!that.options.async) that.userset('color', hex);
      else that.emit('userset', 'color', hex);
    },
    container: document.body,
  });
  c.open(e.pageX, e.pageY);
  c.show();
  this.colorpicker = c;
}

export const Tag = defineClass({
  Extends: Widget,

  _options: Object.assign(Object.create(Widget.prototype._options), {
    color: 'string|null',
    tag: 'string',
    async: 'boolean',
    node_class: 'constructor',
  }),
  options: {
    color: null,
    tag: '',
    async: false,
    node_class: TagNode,
  },
  initialize: function (options) {
    Widget.prototype.initialize.call(this, options);
    this.nodes = [];
  },
  destroy: function () {
    const l = this.nodes.length;
    for (let i = 0; i < l; i++) this.removeNode(this.nodes[i]);
    Widget.prototype.destroy.call(this);
  },

  redraw: function () {
    const I = this.invalid;
    const O = this.options;
    if (I.color) {
      I.color = false;
      for (let i = 0; i < this.nodes.length; i++) {
        this.nodes[i].element.style.backgroundColor = O.color;
        if (O.color)
          this.nodes[i].element.style.color =
            RGBToGray(hexToRGB(O.color)) > 0.5 ? 'black' : 'white';
        else this.nodes[i].element.style.color = null;
      }
    }
    if (I.tag) {
      I.tag = false;
      for (let i = 0; i < this.nodes.length; i++)
        this.nodes[i].children[0].textContent = O.tag;
    }
    Widget.prototype.redraw.call(this);
  },
  removeNode: function (node) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i] == node) {
        node.element.remove();
        this.emit('noderemoved', node);
        this.nodes.splice(i, 1);
        node.destroy();
        return true;
      }
    }
  },
  createNode: function (options) {
    const O = this.options;
    options = options || {};
    options.color = O.color;
    options.tag = O.tag;
    const node = new O.node_class(options, this);
    node.on('colorize', colorize.bind(this));
    node.on('remove', remove.bind(this));
    this.nodes.push(node);
    this.emit('nodecreated', node);
    return node;
  },
  set: function (key, value) {
    switch (key) {
      case 'color':
        for (let i = 0; i < this.nodes.length; i++)
          this.nodes[i].set('color', this.options.color);
        break;
      case 'tag':
        for (let i = 0; i < this.nodes.length; i++)
          this.nodes[i].set('tag', this.options.tag);
        break;
    }
    return Widget.prototype.set.call(this, key, value);
  },
});
