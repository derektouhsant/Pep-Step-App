import { esc } from '../utils.js';
import {
  INCLINE_VALUES,
  MINUTE_VALUES,
  SECOND_VALUES,
  SPEED_VALUES,
  closest,
  formatBout,
  formatTreadmillPrevious,
  splitDuration,
} from '../data/treadmill.js';

function wheel({ label, unit, values, selected, ei, si, field, format }) {
  const idx = values.indexOf(selected);
  const safeIdx = idx < 0 ? 0 : idx;
  return `
    <div class="wheel-col">
      <div class="wheel-frame">
        <div
          class="wheel"
          data-wheel
          data-ei="${ei}"
          data-si="${si}"
          data-field="${field}"
          data-index="${safeIdx}"
          role="listbox"
          aria-label="${esc(label)}"
          tabindex="0"
        >
          <div class="wheel-pad"></div>
          <div class="wheel-pad"></div>
          ${values
            .map(
              (value, i) => `
            <div class="wheel-item${i === safeIdx ? ' is-active' : ''}" role="option" data-value="${value}" ${
              i === safeIdx ? 'aria-selected="true"' : ''
            }>${esc(format(value))}</div>`
            )
            .join('')}
          <div class="wheel-pad"></div>
          <div class="wheel-pad"></div>
        </div>
        <div class="wheel-highlight" aria-hidden="true"></div>
      </div>
      <div class="wheel-unit">${esc(unit)}</div>
    </div>
  `;
}

function renderBout(set, ei, si) {
  const incline = closest(INCLINE_VALUES, set.incline, INCLINE_VALUES[0]);
  const speed = closest(SPEED_VALUES, set.speed, SPEED_VALUES[0]);
  const { minutes, seconds } = splitDuration(set.durationSec);
  return `
    <div class="bout">
      <div class="row bout-head">
        <div class="tiny">Bout ${si + 1}</div>
        <button class="check ${set.done ? 'on' : ''}" data-act="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="${
          set.done ? 'Bout logged' : 'Mark bout done'
        }" aria-pressed="${set.done ? 'true' : 'false'}">${set.done ? '✓' : ''}</button>
      </div>
      <div class="bout-pickers">
        <div class="picker-group">
          <div class="wheel-label">Incline</div>
          ${wheel({
            label: 'Incline',
            unit: '%',
            values: INCLINE_VALUES,
            selected: incline,
            ei,
            si,
            field: 'incline',
            format: (value) => Number(value).toFixed(1),
          })}
        </div>
        <div class="picker-group">
          <div class="wheel-label">Speed</div>
          ${wheel({
            label: 'Speed',
            unit: 'mph',
            values: SPEED_VALUES,
            selected: speed,
            ei,
            si,
            field: 'speed',
            format: (value) => Number(value).toFixed(1),
          })}
        </div>
        <div class="picker-group picker-time">
          <div class="wheel-label">Time</div>
          <div class="time-wheels">
            ${wheel({
              label: 'Minutes',
              unit: 'min',
              values: MINUTE_VALUES,
              selected: minutes,
              ei,
              si,
              field: 'minutes',
              format: (value) => String(value),
            })}
            ${wheel({
              label: 'Seconds',
              unit: 'sec',
              values: SECOND_VALUES,
              selected: seconds,
              ei,
              si,
              field: 'seconds',
              format: (value) => String(value).padStart(2, '0'),
            })}
          </div>
        </div>
      </div>
      <div class="bout-readout" data-bout-readout="${ei}-${si}" aria-live="polite">${esc(formatBout(set))}</div>
    </div>
  `;
}

export function renderTreadmillBlock(ex, ei, prev) {
  const prevLine = formatTreadmillPrevious(prev);
  const bouts = (ex.sets || []).map((set, si) => renderBout(set, ei, si)).join('');
  return `
    <section class="card">
      <div class="row">
        <div>
          <div class="tiny">Cardio</div>
          <div class="meal-title">${esc(ex.name || 'Treadmill')}</div>
        </div>
        <button class="danger" data-act="remove-exercise" data-ei="${ei}">Remove</button>
      </div>
      <div class="prev-line">${prevLine ? esc(prevLine) : 'No previous performance yet'}</div>
      ${bouts}
      <button class="text-btn" data-act="add-set" data-ei="${ei}">+ Add bout</button>
    </section>
  `;
}
