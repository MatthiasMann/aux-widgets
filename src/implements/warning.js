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
import { addClass, removeClass } from '../utils/dom.js';

function reset(element) {
  const i = this.elements.indexOf(element);
  if (i < 0) return;
  removeClass(this.elements[i], 'aux-warn');
  this.elements.splice(i, 1);
  this.timeouts.splice(i, 1);
  /**
   * Gets fired when the warning class was removed.
   *
   * @event Warning#warning_released
   *
   * @param {HTMLElement|SVGElement} element - The element which lost the warning class.
   */
  this.emit('warning_released', element);
}

/**
 * Adds the class "aux-warn" on <code>this.element</code> for a certain
 * period of time. It is used e.g. in {@link ChartHandle} or {@link Knob} when the value
 * exceeds the range.
 *
 * @mixin Warning
 */
export const Warning = defineClass({
  elements: [],
  timeouts: [],
  /**
   * Adds the class <code>.aux-warn</code> to the given element and
   * sets a timeout after which the class is removed again. If there
   * already is a timeout waiting it gets updated.
   *
   * @method Warning#warning
   *
   * @emits Warning#warning
   *
   * @param {HTMLElement|SVGElement} element - The DOM node the class should be set on.
   * @param {Number} [timeout=250] - The timeout in milliseconds until the class should be removed again.
   */
  warning: function (element, timeout) {
    if (!timeout) timeout = 250;
    let i;
    if ((i = this.elements.indexOf(element)) >= 0) {
      window.clearTimeout(this.timeouts[i]);
    } else {
      i = this.elements.length;
    }
    this.elements[i] = element;
    this.timeouts[i] = window.setTimeout(reset.bind(this, element), timeout);
    addClass(element, 'aux-warn');
    /**
     * Gets fired when {@link Warning#warning} was called.
     *
     * @event Warning#warning
     *
     * @param {HTMLElement|SVGElement} element - The element which received the warning class.
     */
    this.emit('warning', element);
  },
});
