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

import { Container } from './container.js';
import { Widget } from './widget.js';
import { addClass, element, innerWidth, innerHeight, outerWidth, outerHeight } from '../utils/dom.js';
import { defineChildWidget } from '../child_widget.js';
import { DragValue } from '../modules/dragvalue.js';

import {
  rangedOptionsDefaults,
  rangedOptionsTypes,
  makeRanged,
} from '../utils/make_ranged.js';

function vert () {
  return this.options.position === ('right' || 'left');
}

/**
 * ScrollHide is a special {@link Container} used inside {@link Scroller}
 * for hiding browsers native scroll bars.
 *
 * @extends Container
 *
 * @class ScrollHide
 */
export class ScrollHide extends Container {
  draw(O, element) {
    /**
     * @member {HTMLDivElement} ScrollHide#element - The container.
     *   Has class <code>.aux-scrollhide</code>.
     */
    addClass(element, 'aux-scrollhide');
    super.draw(O, element);
  }
};

function setScrollRange() {
  const O = this.options;
  const max = O.content - O.clip;
  this.set('max', max);
  const size = O.clip / O.content;
  this.set('basis', O.clip - size * O.clip);
}

/**
 * ScrollBar is a widget offering the functionality of a browsers
 * native scroll bar handle.
 *
 * @extends Widget
 * 
 * @class ScrollBar
 *
 * @property {String} [position='right'] - The border the scrollbar is
 *   attached to, either `top`, `right`, `bottom` or `left`.
 */
export class ScrollBar extends Widget {
  static get _options() {
    return Object.assign(
      {},
      Widget.getOptionTypes(),
      rangedOptionsTypes,
      DragValue.getOptionTypes(),
      {
        position: 'string',
        content: 'number',
        clip: 'number',
        scroll: 'number',
      }
    );
  }
  static get options() {
    return Object.assign({}, rangedOptionsDefaults, {
      position: 'right',
      content: 0,
      clip: 0,
      scroll: 0,
    });
  }
  static get static_events() {
    return {
      set_content: setScrollRange,
      set_clip: setScrollRange,
      set_position: function (pos) {
        this.drag.set('direction', vert.call(this) ? 'vertical' : 'horizontal');
        this.drag.set('reverse', vert.call(this) ? true : false);
      },
    }
  }
  initialize(options) {
    if (!options.element) options.element = element('div');
    const E = this.element;
    super.initialize(options);

    this.drag = new DragValue(this, {
      node: E,
      classes: E,
      get: function () { return this.parent.options.scroll; },
      set: function (v) { return this.parent.userset('scroll', v); },
      limit: true,
      absolute: true,
    });
    this.set('position', this.options.position);
  }
  draw(O, element) {
    /**
     * @member {HTMLDivElement} Scroller#element - The scrollbar handle.
     *   Has class <code>.aux-scrollbar</code>.
     */
    addClass(element, 'aux-scrollbar');

    super.draw(O, element);
  }
  redraw() {
    const O = this.options;
    const E = this.element;
    const I = this.invalid;
    if (I.position) {
      this.removeClass(
        'aux-left',
        'aux-right',
        'aux-top',
        'aux-bottom',
        'aux-vertical',
        'aux-horizontal'
      );
      this.addClass('aux-' + O.position);
      this.addClass('aux-' + (vert.call(this) ? 'vertical' : 'horizontal'));
    }
    if (I.validate('position', 'content', 'clip', 'scroll')) {
      const clip = O.clip;
      const content = O.content;
      const scroll = O.scroll;
      if (clip && content) {
        let size = clip / content;
        if (size >= 1) {
          //this.update('visible', false);
          this.element.style.display = 'none';
        } else {
          //this.update('visible', true);
          this.element.style.display = 'block';
          let pos = scroll / (content - clip);
          pos = (pos * (clip - (size * clip)));
          if (vert.call(this)) {
            outerHeight(this.element, true, clip * size);
            this.element.style.top = pos + 'px';
          }
          else {
            outerWidth(this.element, true, clip * size);
            this.element.style.left = pos + 'px';
          }
        }
      } else {
        //this.update('visible', false);
        this.element.style.display = 'none';
      }
    }
    super.redraw();
  }
}
makeRanged(ScrollBar);

/**
 * Scroller mimics the behavior of typical operating system scrollbars
 * to be used in {@link Container}s hiding the generic scroll bars for styling
 * purposes.
 *
 * @extends Container
 *
 * @class Scroller
 *
 * @param {Object} [options={ }] - An object containing initial options.
 *
 * @property {Boolean} [scroll_x=true] Scroll in x direction.
 * @property {Boolean} [scroll_y=true] Scroll in y direction.
 */

function changed (e) {
  this.scroll_x.update('content', this.scrollhide.element.scrollWidth);
  this.scroll_x.update('scroll', this.scrollhide.element.scrollLeft);
  this.scroll_y.update('content', this.scrollhide.element.scrollHeight);
  this.scroll_y.update('scroll', this.scrollhide.element.scrollTop);
}
function usersetScrollX(key, value) {
  this.parent.scrollhide.element.scrollLeft = value;
}
function usersetScrollY(key, value) {
  this.parent.scrollhide.element.scrollTop = value;
}
export class Scroller extends Container {
  static get _options() {
    return Object.assign({}, Container.getOptionTypes(), {
      scroll_x: 'boolean',
      scroll_y: 'boolean',
    });
  }
  static get options() {
    return {
      scroll_x: true,
      scroll_y: true,
    }
  }
  initialize(options) {
    this.__elementChildren = [];
    if (!options.element) options.element = element('div');
    else this.__elementChildren = [...options.element.children];
    super.initialize(options);
    this._changed = changed.bind(this);
    this.observer = new MutationObserver(this._changed);
  }
  draw(O, element) {
    /**
     * @member {HTMLDivElement} Scroller#element - The scrollbar handle.
     *   Has class <code>.aux-scrollbar</code>.
     */
    addClass(element, 'aux-scroller');

    for (let i = 0, m = this.__elementChildren.length; i < m; ++i) {
      this.scrollhide.element.appendChild(this.__elementChildren[i]);
    }

    this.scroll_x.addEventListener('userset', usersetScrollX);
    this.scroll_y.addEventListener('userset', usersetScrollY);

    this.scrollhide.element.addEventListener('scroll', this._changed);
    
    super.draw(O, element);
  }
  redraw() {
    const O = this.options;
    const E = this.element;
    const I = this.invalid;
    if (I.validate('scroll_x')) {
      this[O.scroll_x ? 'addClass' : 'removeClass']('aux-scrollx');
    }
    if (I.validate('scroll_y')) {
      this[O.scroll_y ? 'addClass' : 'removeClass']('aux-scrolly');
    }
    super.redraw();
  }
  resize() {
    this._changed();
    this.scroll_x.update('clip', innerWidth(this.element, undefined, true));
    this.scroll_y.update('clip', innerHeight(this.element, undefined, true));
    super.resize();
  }
  appendChild(child) {
    super.appendChild(child);
    this.scrollhide.appendChild(child.element);
  }
  set(key, value) {
    if (key === 'scroll' && value == this.options.scroll)
      return;
    super.set(key, value);
  }
}

defineChildWidget(Scroller, 'scrollhide', {
  create: ScrollHide,
  show: true,
});

defineChildWidget(Scroller, 'scroll_x', {
  create: ScrollBar,
  show: true,
  default_options: {
    position: 'bottom',
  },
});
defineChildWidget(Scroller, 'scroll_y', {
  create: ScrollBar,
  show: true,
});
