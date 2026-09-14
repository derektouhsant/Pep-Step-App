import { BODY_PARTS, bodyPartName, isCardio } from '../data/exercises.js';
import { esc, formatDuration, formatTime } from '../utils.js';
import { icons } from '../icons.js';

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

export function renderWorkouts(state, ui, catalog) {
  if (ui.workoutView === 'browse') return renderBrowse(ui, catalog);
  if (ui.workoutView === 'logger') return renderLogger(state, catalog);
  if (ui.workoutView === 'plans') return renderPlans(state);
  if (ui.workoutView === 'builder') return renderBuilder(ui);
  if (ui.workoutView === 'videos') return renderVideos(ui, catalog);
  return renderHome(state);
}

function backBtn(label = 'Workouts') {
  return `<div class="back-row"><button data-act="workout-home">${esc(label)}</button></div>`;
}

function renderHome(state) {
  const active = state.activeWorkout;
  const recent = (state.workoutHistory || []).slice(0, 5);
  return `
    ${
      active
        ? `<section class="card hero-card">
            <div class="tiny">In progress</div>
            <h2 style="margin:6px 0 4px;font-size:20px">${esc(active.name || 'Workout')}</h2>
            <p class="muted">Started ${esc(formatTime(active.startedAt))} · ${(active.exercises || []).length} exercises</p>
            <div class="grid-2" style="margin-top:12px">
              <button class="steel-btn" data-act="open-logger">Resume</button>
              <button class="steel-btn" data-act="finish-workout" style="background:transparent;border:1px solid rgba(255,255,255,.35)">Finish</button>
            </div>
          </section>`
        : `<section class="card hero-card">
            <div class="tiny">Workouts</div>
            <h2 style="margin:6px 0 4px;font-size:20px">Ready when you are</h2>
            <p class="muted">Log sets, browse by body part, or start a full-coverage plan.</p>
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
      <button class="tile" data-act="open-videos">
        <h3>Video library</h3>
        <p>Form videos coming soon</p>
      </button>
      <button class="tile" data-act="open-builder">
        <h3>Plan builder</h3>
        <p>Every body part, then save</p>
      </button>
    </div>

    <section class="card">
      <div class="tiny">History</div>
      ${
        recent.length
          ? recent
              .map(
                (w) => `
        <div class="history-item">
          <div class="row">
            <strong>${esc(w.name || 'Workout')}</strong>
            <span class="muted">${esc(formatDuration(w.finishedAt - w.startedAt))}</span>
          </div>
          <div class="muted">${new Date(w.finishedAt).toLocaleDateString()} · ${(w.exercises || []).length} exercises</div>
        </div>`
              )
              .join('')
          : `<p class="muted" style="margin:8px 0 0">Finished workouts will show up here.</p>`
      }
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
            <div class="food-meta">${esc(e.equipment)} · ${esc(bodyPartName(e.bodyPart))}</div>
          </div>
          <button class="steel-btn" data-act="add-exercise" data-id="${esc(e.id)}">Add</button>
        </div>`
              )
              .join('')
          : `<p class="muted">No exercises match.</p>`
      }
    </section>
  `;
}

function renderLogger(state, catalog) {
  const w = state.activeWorkout;
  if (!w) {
    return `${backBtn()}<section class="card"><p>No active workout.</p><button class="primary-btn" data-act="start-workout">Start workout</button></section>`;
  }

  const blocks = (w.exercises || [])
    .map((ex, ei) => {
      const prev = state.lastSets[ex.exerciseId];
      const cardio = isCardio(catalog.find((c) => c.id === ex.exerciseId) || ex);
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
    ${blocks || `<section class="card"><p class="muted">Add an exercise to start logging sets.</p></section>`}
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
        : `<section class="card"><p class="muted">No saved plans yet.</p><button class="primary-btn" data-act="open-builder">Build a plan</button></section>`
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
