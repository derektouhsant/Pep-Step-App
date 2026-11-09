import { esc, formatPrettyDate } from '../utils.js';
import { phaseSpans, resolveToday } from '../program.js';

function previewList(exercises, limit = 8) {
  const list = exercises || [];
  const shown = list.slice(0, limit);
  const extra = list.length - shown.length;
  if (!shown.length) return '';
  return `
    <ul class="program-list">
      ${shown
        .map(
          (ex) =>
            `<li>${esc(ex.name)}${ex.target ? ` <span class="preview-target">${esc(ex.target)}</span>` : ''}</li>`
        )
        .join('')}
      ${extra > 0 ? `<li class="preview-target">+ ${extra} more</li>` : ''}
    </ul>
  `;
}

function whenLabel(iso) {
  if (!iso) return '';
  return formatPrettyDate(iso);
}

function sentenceWhen(iso) {
  const label = whenLabel(iso);
  if (label === 'Tomorrow') return 'tomorrow';
  if (label === 'Today') return 'today';
  if (label === 'Yesterday') return 'yesterday';
  return label;
}

export function renderTodayProgramCard(plan, today) {
  const slot = resolveToday(plan, today);
  if (!slot) return '';

  if (slot.kind === 'complete') {
    return `
      <section class="card">
        <div class="tiny">Today's workout</div>
        <h3 class="home-card-title">16 weeks complete</h3>
        <p class="muted">You finished this movement plan. Logged sessions stay in history.</p>
        <button class="cta-btn" data-act="regenerate-program">Regenerate plan</button>
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="open-program">View plan</button>
      </section>
    `;
  }

  const weekLine = `Week ${slot.week} of ${slot.totalWeeks}${slot.phase ? ` · ${esc(slot.phase)}` : ''}`;

  if (slot.kind === 'rest') {
    const next = slot.next;
    const nextWhen = next ? whenLabel(next.scheduledDate) : '';
    return `
      <section class="card">
        <div class="row">
          <div class="tiny">Today's workout</div>
          <span class="status-pill">Rest</span>
        </div>
        <h3 class="home-card-title">Rest day</h3>
        <p class="muted">${weekLine}. The next session stays queued.</p>
        ${
          next
            ? `<p class="meal-title" style="margin:10px 0 0">Next up · ${esc(next.dayName)}${
                nextWhen ? ` · ${esc(nextWhen)}` : ''
              }</p>${previewList(next.exercises, 4)}`
            : ''
        }
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="open-program">View plan</button>
      </section>
    `;
  }

  if (slot.kind === 'upcoming') {
    const when = whenLabel(slot.scheduledDate);
    return `
      <section class="card">
        <div class="row">
          <div class="tiny">Today's workout</div>
          <span class="status-pill done">Done today</span>
        </div>
        <h3 class="home-card-title">Done for today</h3>
        <p class="muted">${weekLine}. Next up stays queued${when ? ` for ${esc(sentenceWhen(slot.scheduledDate))}` : ''}.</p>
        <p class="meal-title" style="margin:10px 0 0">${esc(slot.dayName)}</p>
        ${previewList(slot.exercises)}
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="open-program">View plan</button>
      </section>
    `;
  }

  return `
    <section class="card hero-card">
      <div class="row">
        <div class="tiny">Today's workout</div>
        <span class="status-pill live">${slot.queued ? 'Queued' : 'Ready'}</span>
      </div>
      <h3 class="home-card-title">${esc(slot.dayName || 'Workout')}</h3>
      <p class="muted">${weekLine}${slot.queued ? ' · This session stays here until you do it.' : ''}</p>
      ${previewList(slot.exercises)}
      <button class="cta-btn" data-act="start-program">Start</button>
      <button class="text-btn" style="width:100%;margin-top:8px" data-act="open-program">View plan</button>
    </section>
  `;
}

export function renderPhasePills(doc) {
  return `
    <div class="phase-pills">
      ${phaseSpans(doc)
        .map((span) => {
          const label = span.start === span.end ? `Week ${span.start}` : `Weeks ${span.start}–${span.end}`;
          return `<span class="phase-pill">${esc(span.name)} · ${label}</span>`;
        })
        .join('')}
    </div>
  `;
}
