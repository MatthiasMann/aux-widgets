import { ResponseHandle } from '../src/modules/responsehandle.mjs';
import { EqBand } from '../src/modules/eqband.mjs';
import { Chart } from '../src/widgets/chart.mjs';
import { ResponseHandler } from '../src/widgets/responsehandler.mjs';
import { Equalizer } from '../src/widgets/equalizer.mjs';
import { Value } from '../src/widgets/value.mjs';
import { Knob } from '../src/widgets/knob.mjs';
import { State } from '../src/widgets/state.mjs';
import { Slider } from '../src/widgets/slider.mjs';
import { Gauge } from '../src/widgets/gauge.mjs';
import { Fader } from '../src/widgets/fader.mjs';
import { Select } from '../src/widgets/select.mjs';
import { ValueButton } from '../src/widgets/valuebutton.mjs';
import { ValueKnob } from '../src/widgets/valueknob.mjs';
import { MeterBase } from '../src/widgets/meterbase.mjs';
import { LevelMeter } from '../src/widgets/levelmeter.mjs';
import { MultiMeter } from '../src/widgets/multimeter.mjs';
import { Notifications } from '../src/widgets/notifications.mjs';
import { Clock } from '../src/widgets/clock.mjs';
import { Dynamics } from '../src/widgets/dynamics.mjs';
import { ColorPicker } from '../src/widgets/colorpicker.mjs';
import { ColorPickerDialog } from '../src/widgets/colorpickerdialog.mjs';
import { Window } from '../src/widgets/window.mjs';
import { ButtonArray } from '../src/widgets/buttonarray.mjs';
import { Crossover, CrossoverBand } from '../src/widgets/crossover.mjs';
import { Expander } from '../src/widgets/expander.mjs';

import { compare, object_minus } from './helpers.mjs';

describe('Widgets', () => {
    it('create', (done) => {
       new ResponseHandle();
       new EqBand();
       new Chart();
       new ResponseHandler();
       new Equalizer();
       new Value();
       new Knob();
       new State();
       new Slider();
       new Gauge();
       new Fader();
       new Select();
       new ValueButton();
       new ValueKnob();
       new MeterBase();
       new LevelMeter();
       new MultiMeter();
       new Notifications();
       new Clock();
       new Dynamics();
       new ColorPicker();
       new ColorPickerDialog();
       new Window();
       new ButtonArray();
       new Crossover();
       new Expander();

       done();
    });
});

describe('Equalizer', () => {
  it('creating bands', (done) => {
    const eq = new Equalizer();

    const b1 = eq.add_band({});
    const b2 = eq.add_band(new EqBand());

    const o1 = object_minus(b1.options, [ "id" ]);
    const o2 = object_minus(b2.options, [ "id" ]);

    if (!compare(o1, o2))
    {
      console.error(b1.options, b2.options);
      throw new Error('Options mismatch.');
    }

    done();
  });
});

describe('Crossover', () => {
  it('creating bands', (done) => {
    const eq = new Crossover();

    const b1 = eq.add_band({});
    const b2 = eq.add_band(new CrossoverBand());

    const o1 = object_minus(b1.options, [ "id" ]);
    const o2 = object_minus(b2.options, [ "id" ]);

    if (!compare(o1, o2))
    {
      console.error(b1.options, b2.options);
      throw new Error('Options mismatch.');
    }

    done();
  });
});
