import { SHOW_WORKOUT_VIDEOS } from '../config.js';
import { BODY_PARTS, bodyPartName, isCardio } from '../data/exercises.js';
import { isTreadmillBlock, workoutTreadmillLines } from '../data/treadmill.js';
import { esc, formatDuration, formatTime, formatWhen } from '../utils.js';
import { icons } from '../icons.js';
import { renderTreadmillBlock } from './treadmill.js';

export function coverageSet(exercises) {
  return new Set((exercises || []).map((e) => e.bodyPart));
}

export function missingParts(exercises) {
  const have = coverageSet(exercises);
  return BODY_PARTS.filter((p) => !have.has(p.id));
}

function coverageGrid(exercises) {
  const have = coverageSet(exercises);
  return `
    <div class="coverage">
      ${BODY_PARTS.map(
        (p) => `<div class="cov ${have.has(p.id) ? 'ok' : ''}">${have.has(p.id) ? '✓ ' : ''}${esc(p.name)}</div>`
      ).join('')}
    </div>
  `;
}

export function renderWorkouts(state, ui, catalog, health) {
  if (ui.workoutView === 'browse') return renderBrowse(ui, catalog);
  if (ui.workoutView === 'logger') return renderLogger(state, catalog);
  if (ui.workoutView === 'plans') return renderPlans(state);
  if (ui.workoutView === 'builder') return renderBuilder(ui);
  if (SHOW_WORKOUT_VIDEOS && ui.workoutView === 'videos') return renderVideos(ui, catalog);
  return renderWorkoutHome(state, health);
}

function backBtn(label = 'Workouts') {
  return `<div class="back-row"><button data-act="workout-home">${esc(label)}</button></div>`;
}

function healthHistoryItem(workout) {
  const minutes = formatDuration((workout.durationSec || 0) * 1000);
  const when = formatWhen(workout.end || workout.start);
  const miles =
    workout.distanceMeters > 0 ? `${(workout.distanceMeters / 1609.344).toFixed(2)} mi` : '';
  const detail = [
    miles,
    workout.energy != null ? `${workout.energy} kcal` : '',
    workout.heartRate != null ? `${workout.heartRate} bpm` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return `
    <div class="history-item">
      <div class="row">
        <strong>${esc(workout.name || 'Workout')}</strong>
        <span class="badge health">Apple Health</span>
      </div>
      <div class="muted">${esc(when)} · ${esc(minutes)}${workout.sourceName ? ` · ${esc(workout.sourceName)}` : ''}</div>
      ${detail ? `<div class="history-detail">${esc(detail)}</div>` : ''}
      <div class="muted">Shown from Apple Health. Not saved as a PepStep log.</div>
    </div>
  `;
}

function combinedHistory(state, health) {
  const manual = (state.workoutHistory || []).map((workout) => ({
    at: workout.finishedAt || workout.startedAt || 0,
    html: `
        <div class="history-item">
          <div class="row">
            <strong>${esc(workout.name || 'Workout')}</strong>
            <span class="muted">${esc(formatDuration((workout.finishedAt || 0) - (workout.startedAt || 0)))}</span>
          </div>
          <div class="muted">${workout.finishedAt ? new Date(workout.finishedAt).toLocaleDateString() : ''} · ${(workout.exercises || []).length} exercises</div>
          ${workoutTreadmillLines(workout)
            .map((line) => `<div class="history-detail">${esc(line)}</div>`)
            .join('')}
        </div>`,
  }));
  const imported = (health?.workouts || []).map((workout) => ({
    at: workout.end || workout.start || 0,
    html: healthHistoryItem(workout),
  }));
  return [...manual, ...imported].sort((a, b) => b.at - a.at).slice(0, 8);
}

function renderWorkoutHome(state, health) {
  const active = state.activeWorkout;
  const recent = combinedHistory(state, health);
  const healthOn = Boolean(health?.supported);
  const healthOff = healthOn && health.status === 'off';
  const emptyCopy = healthOn
    ? 'No finished workouts yet. Start one above, or a Watch workout will show up here labeled Apple Health.'
    : 'No finished workouts yet. Start one above, then tap Finish and it will show up here.';
  return `
    ${
      active
        ? `<section class="card hero-card">
            <div class="tiny">In progress</div>
            <h2 style="margin:6px 0 4px;font-size:20px">${esc(active.name || 'Workout')}</h2>
            <p class="muted">Started ${esc(formatTime(active.startedAt))} · ${(active.exercises || []).length} exercises${
              workoutTreadmillLines(active).length
                ? ` · ${esc(workoutTreadmillLines(active).join(' · '))}`
                : ''
            }</p>
            <div class="grid-2" style="margin-top:12px">
              <button class="steel-btn" data-act="open-logger">Resume</button>
              <button class="steel-btn" data-act="finish-workout" style="background:transparent;border:1px solid rgba(255,255,255,.35)">Finish</button>
            </div>
          </section>`
        : `<section class="card hero-card">
            <div class="tiny">Workouts</div>
            <h2 style="margin:6px 0 4px;font-size:20px">Ready when you are</h2>
            <p class="muted">Log sets or a treadmill bout, browse by body part, or start a full-coverage plan.</p>
            <button class="steel-btn" style="margin-top:12px;width:100%" data-act="start-workout">Start workout</button>
          </section>`
    }

    <div class="grid-2 section-gap">
      <button class="tile" data-act="open-browse">
        <h3>Browse exercises</h3>
        <p>Chest, back, legs, and more</p>
      </button>
      <button class="tile" data-act="open-plans">
        <h3>Plans</h3>
        <p>DIY or AI full-body coverage</p>
      </button>
      ${
        SHOW_WORKOUT_VIDEOS
          ? `<button class="tile" data-act="open-videos">
        <h3>Video library</h3>
        <p>Form videos</p>
      </button>`
          : ''
      }
      <button class="tile" data-act="open-builder">
        <h3>Plan builder</h3>
        <p>Every body part, then save</p>
      </button>
    </div>

    ${
      healthOff
        ? `<section class="card">
            <div class="tiny">Apple Health</div>
            <p class="empty-help">Connect to show Watch workouts here, labeled Apple Health, without copying them into your PepStep log.</p>
            <button class="steel-btn" style="width:100%;margin-top:12px" data-act="connect-health">Connect Apple Health</button>
          </section>`
        : ''
    }

    <section class="card">
      <div class="tiny">History</div>
      ${recent.length ? recent.map((item) => item.html).join('') : `<p class="empty-help">${emptyCopy}</p>`}
    </section>
  `;
}

function renderBrowse(ui, catalog) {
  const part = ui.browsePart || 'chest';
  const q = (ui.search || '').trim().toLowerCase();
  const list = catalog
    .filter((e) => e.bodyPart === part)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q));

  return `
    ${backBtn()}
    <h2 style="margin:0 0 10px;color:var(--navy)">Exercises</h2>
    <input class="search" data-act="search" data-keep="search" placeholder="Search this body part" value="${esc(ui.search || '')}" />
    <div class="part-grid" style="margin-bottom:12px">
      ${BODY_PARTS.map(
        (p) => `<button class="part-chip ${p.id === part ? 'active' : ''}" data-act="set-part" data-part="${p.id}">${esc(p.name)}</button>`
      ).join('')}
    </div>
    <section class="card">
      ${
        list.length
          ? list
              .map(
                (e) => `
        <div class="list-row">
          <div>
            <div class="food-name">${esc(e.name)}</div>
            <div class="food-meta">${esc(e.equipment)} · ${esc(bodyPartName(e.bodyPart))}${
              e.log === 'treadmill' ? ' · Incline, speed, time' : ''
            }</div>
          </div>
          <button class="steel-btn" data-act="add-exercise" data-id="${esc(e.id)}">Add</button>
        </div>`
              )
              .join('')
          : `<p class="empty-help">No exercises match. Try another name, or pick a different body part.</p>`
      }
    </section>
  `;
}

function resolveLog(ex, catalog) {
  if (ex.log === 'treadmill' || ex.log === 'duration' || ex.log === 'strength') return ex.log;
  if (isTreadmillBlock(ex)) return 'treadmill';
  const cat = catalog.find((c) => c.id === ex.exerciseId);
  if (cat?.log) return cat.log;
  if (isCardio(cat || ex)) return 'duration';
  return 'strength';
}

function renderLogger(state, catalog) {
  const w = state.activeWorkout;
  if (!w) {
    return `${backBtn()}<section class="card"><p class="empty-help">No workout is in progress. Start one and add exercises as you go.</p><button class="primary-btn" data-act="start-workout">Start workout</button></section>`;
  }

  const blocks = (w.exercises || [])
    .map((ex, ei) => {
      const prev = state.lastSets[ex.exerciseId];
      const log = resolveLog(ex, catalog);
      if (log === 'treadmill') return renderTreadmillBlock(ex, ei, prev);
      const cardio = log === 'duration';
      const prevLine = prev
        ? `<div class="prev-line">Previous: ${cardio ? `${esc(prev.reps)} min` : `${esc(prev.weight)} lb × ${esc(prev.reps)}`}</div>`
        : `<div class="prev-line">No previous performance yet</div>`;
      const sets = (ex.sets || [])
        .map(
          (set, si) => `
        <tr>
          <td>${si + 1}</td>
          ${
            cardio
              ? `<td colspan="1"><input inputmode="decimal" data-act="set-field" data-ei="${ei}" data-si="${si}" data-field="reps" value="${esc(set.reps ?? '')}" placeholder="min"></td>
                 <td><input inputmode="decimal" data-act="set-field" data-ei="${ei}" data-si="${si}" data-field="weight" value="${esc(set.weight ?? '')}" placeholder="cals"></td>`
              : `<td><input inputmode="decimal" data-act="set-field" data-ei="${ei}" data-si="${si}" data-field="weight" value="${esc(set.weight ?? '')}" placeholder="lb"></td>
                 <td><input inputmode="decimal" data-act="set-field" data-ei="${ei}" data-si="${si}" data-field="reps" value="${esc(set.reps ?? '')}" placeholder="reps"></td>`
          }
          <td>
            <button class="check ${set.done ? 'on' : ''}" data-act="toggle-set" data-ei="${ei}" data-si="${si}">${set.done ? '✓' : ''}</button>
          </td>
        </tr>`
        )
        .join('');

      return `
        <section class="card">
          <div class="row">
            <div>
              <div class="tiny">${esc(bodyPartName(ex.bodyPart))}</div>
              <div class="meal-title">${esc(ex.name)}</div>
            </div>
            <button class="danger" data-act="remove-exercise" data-ei="${ei}">Remove</button>
          </div>
          ${prevLine}
          <table class="set-table">
            <thead>
              <tr>
                <th>Set</th>
                <th>${cardio ? 'Min' : 'Lbs'}</th>
                <th>${cardio ? 'Cals' : 'Reps'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${sets}</tbody>
          </table>
          <button class="text-btn" data-act="add-set" data-ei="${ei}">+ Add set</button>
        </section>
      `;
    })
    .join('');

  return `
    ${backBtn()}
    <div class="row" style="margin-bottom:10px">
      <h2 style="margin:0;color:var(--navy)">${esc(w.name || 'Workout')}</h2>
      <button class="steel-btn" data-act="finish-workout">Finish</button>
    </div>
    ${blocks || `<section class="card"><p class="empty-help">This workout is empty. Add an exercise below, then log sets, reps, or a treadmill bout.</p></section>`}
    <button class="primary-btn" data-act="open-browse">Add exercise</button>
  `;
}

function renderPlans(state) {
  const plans = state.plans || [];
  return `
    ${backBtn()}
    <div class="row">
      <h2 style="margin:0;color:var(--navy)">Plans</h2>
      <button class="text-btn" data-act="open-builder">New</button>
    </div>
    <p class="muted">DIY plans must include every body part. AI plans fill all parts for you.</p>
    ${
      plans.length
        ? plans
            .map(
              (p) => `
      <section class="card">
        <div class="row">
          <div>
            <div class="meal-title">${esc(p.name)}</div>
            <div class="muted">${esc(p.source === 'ai' ? 'AI coverage' : 'DIY')} · ${(p.exercises || []).length} exercises</div>
          </div>
          <span class="badge">${esc(p.source || 'diy')}</span>
        </div>
        ${coverageGrid(p.exercises)}
        <div class="grid-2">
          <button class="steel-btn" data-act="start-plan" data-id="${esc(p.id)}">Start</button>
          <button class="danger" data-act="delete-plan" data-id="${esc(p.id)}">Delete</button>
        </div>
      </section>`
            )
            .join('')
        : `<section class="card"><p class="empty-help">No saved plans yet. Build one that covers every body part, or let AI fill them in.</p><button class="primary-btn" data-act="open-builder">Build a plan</button></section>`
    }
  `;
}

function renderBuilder(ui) {
  const b = ui.builder || { name: '', exercises: [], source: 'diy' };
  const missing = missingParts(b.exercises);
  const canSaveDiy = missing.length === 0 && (b.exercises || []).length > 0;
  const canSaveAi = b.source === 'ai' && missing.length === 0;
  const canSave = b.source === 'ai' ? canSaveAi : canSaveDiy;

  return `
    ${backBtn()}
    <h2 style="margin:0 0 8px;color:var(--navy)">Plan builder</h2>
    <section class="card">
      <div class="field">
        <label for="plan-name">Plan name</label>
        <input id="plan-name" data-act="plan-name" data-keep="plan-name" value="${esc(b.name)}" placeholder="e.g. Full coverage A" />
      </div>
      <div class="grid-2">
        <button class="part-chip ${b.source === 'diy' ? 'active' : ''}" data-act="builder-source" data-source="diy">DIY</button>
        <button class="part-chip ${b.source === 'ai' ? 'active' : ''}" data-act="builder-source" data-source="ai">AI coverage</button>
      </div>
      ${
        b.source === 'diy'
          ? `<p class="warn" style="margin-top:12px">DIY save requires at least one exercise from <strong>every</strong> body part.</p>`
          : `<p class="warn" style="margin-top:12px">AI builds a plan that covers all body parts. You can regenerate or add more.</p>
             <button class="steel-btn" style="margin-top:10px;width:100%" data-act="ai-generate">Generate AI plan</button>`
      }
      ${coverageGrid(b.exercises)}
      ${(b.exercises || [])
        .map(
          (e, i) => `
        <div class="list-row">
          <div>
            <div class="food-name">${esc(e.name)}</div>
            <div class="food-meta">${esc(bodyPartName(e.bodyPart))}</div>
          </div>
          <button class="danger" data-act="builder-remove" data-i="${i}">Remove</button>
        </div>`
        )
        .join('')}
      <button class="add-food" data-act="builder-browse">+ Add exercise</button>
      ${
        !canSave && b.source === 'diy'
          ? `<p class="muted">Still need: ${missing.map((p) => p.name).join(', ') || '—'}</p>`
          : ''
      }
      <button class="primary-btn" data-act="save-plan" ${canSave ? '' : 'disabled'}>Save plan</button>
    </section>
  `;
}

function renderVideos(ui, catalog) {
  const part = ui.browsePart || 'chest';
  const q = (ui.search || '').trim().toLowerCase();
  const list = catalog
    .filter((e) => e.bodyPart === part)
    .filter((e) => !q || e.name.toLowerCase().includes(q));

  return `
    ${backBtn()}
    <h2 style="margin:0 0 8px;color:var(--navy)">Video library</h2>
    <p class="muted">Placeholders for now — form videos will land here later.</p>
    <input class="search" data-act="search" data-keep="search" placeholder="Search videos" value="${esc(ui.search || '')}" />
    <div class="part-grid" style="margin-bottom:12px">
      ${BODY_PARTS.map(
        (p) => `<button class="part-chip ${p.id === part ? 'active' : ''}" data-act="set-part" data-part="${p.id}">${esc(p.name)}</button>`
      ).join('')}
    </div>
    ${list
      .map(
        (e) => `
      <button class="card video-thumb" data-act="play-video" data-id="${esc(e.id)}" style="display:block;text-align:left;padding:0;overflow:hidden">
        <div class="video-thumb" style="margin:0;border-radius:16px 16px 0 0">
          <div class="play">${icons.play}</div>
        </div>
        <div style="padding:12px 14px 14px">
          <div class="food-name">${esc(e.name)}</div>
          <div class="food-meta">${esc(bodyPartName(e.bodyPart))} · Video coming soon</div>
        </div>
      </button>`
      )
      .join('')}
  `;
}
