import { BODY_PARTS, bodyPartName, isCardio } from '../data/exercises.js';
import { isTreadmillBlock, workoutTreadmillLines } from '../data/treadmill.js';
import { formatMiles, visibleHealthWorkouts } from '../health/model.js';
import { activeProgramPlan, isProgramPlan, programDoc, resolveToday } from '../program.js';
import { esc, formatDuration, formatTime, todayISO } from '../utils.js';
import { icons } from '../icons.js';
import { renderTreadmillBlock } from './treadmill.js';
import { renderPhasePills, renderTodayProgramCard } from './programCard.js';

export function coverageSet(exercises) {
  const list = Array.isArray(exercises) ? exercises : [];
  return new Set(list.map((e) => e.bodyPart));
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

export function renderWorkouts(state, ui, catalog, extras = {}) {
  if (ui.workoutView === 'browse') return renderBrowse(ui, catalog);
  if (ui.workoutView === 'logger') return renderLogger(state, catalog);
  if (ui.workoutView === 'plans') return renderPlans(state);
  if (ui.workoutView === 'program') return renderProgram(state);
  if (ui.workoutView === 'builder') return renderBuilder(ui);
  if (ui.workoutView === 'videos') return renderVideos(ui, catalog);
  return renderHome(state, extras.health);
}

function backBtn(label = 'Workouts') {
  return `<div class="back-row"><button data-act="workout-home">${esc(label)}</button></div>`;
}

function healthDetail(workout) {
  const parts = [];
  const seconds = Number(workout.durationSec) || 0;
  parts.push(seconds > 0 && seconds < 60 ? `${seconds} sec` : formatDuration(seconds * 1000));
  const miles = formatMiles(workout.distanceMeters);
  if (miles) parts.push(miles);
  if (workout.avgHeartRate) parts.push(`${workout.avgHeartRate} bpm avg`);
  if (workout.calories > 0) parts.push(`${workout.calories} cal`);
  return parts.join(' · ');
}

function historyEntries(state, health) {
  const manual = (state.workoutHistory || []).map((workout) => ({
    kind: 'manual',
    at: workout.finishedAt || 0,
    workout,
  }));
  const imported =
    health?.supported && health.enabled
      ? visibleHealthWorkouts(health.workouts, state).map((workout) => ({
          kind: 'health',
          at: workout.finishedAt || 0,
          workout,
        }))
      : [];
  const limit = imported.length ? 8 : 5;
  return [...manual, ...imported].sort((a, b) => b.at - a.at).slice(0, limit);
}

function renderHistoryItem(entry) {
  if (entry.kind === 'health') {
    const workout = entry.workout;
    return `
      <div class="history-item">
        <div class="row">
          <strong>${esc(workout.name || 'Workout')}</strong>
          <span class="health-badge">Apple Health</span>
        </div>
        <div class="muted">${new Date(workout.finishedAt).toLocaleDateString()} · ${esc(healthDetail(workout))}</div>
      </div>`;
  }
  const w = entry.workout;
  return `
    <div class="history-item">
      <div class="row">
        <strong>${esc(w.name || 'Workout')}</strong>
        <span class="muted">${esc(formatDuration(w.finishedAt - w.startedAt))}</span>
      </div>
      <div class="muted">${new Date(w.finishedAt).toLocaleDateString()} · ${(w.exercises || []).length} exercises</div>
      ${workoutTreadmillLines(w)
        .map((line) => `<div class="history-detail">${esc(line)}</div>`)
        .join('')}
    </div>`;
}

function renderHome(state, health) {
  const active = state.activeWorkout;
  const recent = historyEntries(state, health);
  return `
    ${
      active
        ? `<section class="card hero-card">
            <div class="tiny">In progress</div>
            <h2 style="margin:6px 0 4px;font-size:20px">${esc(active.name || 'Workout')}</h2>
            ${active.programWeek ? `<p class="muted" style="margin:0">Week ${active.programWeek} of 16</p>` : ''}
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
        : activeProgramPlan(state)
          ? renderTodayProgramCard(activeProgramPlan(state), todayISO())
          : `<section class="card hero-card">
            <div class="tiny">Workouts</div>
            <h2 style="margin:6px 0 4px;font-size:20px">Ready when you are</h2>
            <p class="muted">One tap builds four months of movement at home. Bodyweight practice and treadmill time, three days on and one day of rest.</p>
            <button class="cta-btn" data-act="build-program">Build my 4-month plan</button>
            <button class="steel-btn" style="margin-top:8px;width:100%;background:transparent;border:1px solid rgba(255,255,255,.35)" data-act="start-workout">Start an empty workout</button>
          </section>`
    }

    <div class="grid-2 section-gap">
      <button class="tile" data-act="open-browse">
        <h3>Browse exercises</h3>
        <p>Chest, back, legs, and more</p>
      </button>
      <button class="tile" data-act="open-plans">
        <h3>Plans</h3>
        <p>16-week plan, DIY, or AI</p>
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
          ? recent.map((entry) => renderHistoryItem(entry)).join('')
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
            <div class="food-meta">${esc(e.equipment)} · ${esc(bodyPartName(e.bodyPart))}${
              e.log === 'treadmill' ? ' · Incline, speed, time' : ''
            }</div>
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
    return `${backBtn()}<section class="card"><p>No active workout.</p><button class="primary-btn" data-act="start-workout">Start workout</button></section>`;
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
          ${ex.target ? `<div class="prev-line">Target: ${esc(ex.target)}</div>` : ''}
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
    <div class="row" style="margin-bottom:${w.programWeek ? '4px' : '10px'}">
      <h2 style="margin:0;color:var(--navy)">${esc(w.name || 'Workout')}</h2>
      <button class="steel-btn" data-act="finish-workout">Finish</button>
    </div>
    ${w.programWeek ? `<p class="muted" style="margin:0 0 10px">Week ${w.programWeek} of 16</p>` : ''}
    ${blocks || `<section class="card"><p class="muted">Add an exercise to start logging sets.</p></section>`}
    <button class="primary-btn" data-act="open-browse">Add exercise</button>
  `;
}

function renderProgramCard(plan, todaySlot) {
  const doc = programDoc(plan);
  const where =
    todaySlot?.kind === 'complete'
      ? '16 weeks complete'
      : todaySlot
        ? `Week ${todaySlot.week} of ${todaySlot.totalWeeks}${todaySlot.dayName ? ` · ${todaySlot.dayName}` : ''}`
        : '16 weeks';
  return `
    <section class="card">
      <div class="row">
        <div>
          <div class="meal-title">${esc(plan.name)}</div>
          <div class="muted">${esc(where)} · ${esc(doc?.split || (doc?.daysPerWeek ? `${doc.daysPerWeek} days a week` : '16 weeks'))}</div>
        </div>
        <span class="badge">16 weeks</span>
      </div>
      <div class="grid-2">
        <button class="steel-btn" data-act="open-program">View</button>
        <button class="danger" data-act="end-program">End</button>
      </div>
    </section>
  `;
}

function renderPlans(state) {
  const program = activeProgramPlan(state);
  const plans = (state.plans || []).filter((plan) => !isProgramPlan(plan));
  const todaySlot = program ? resolveToday(program, todayISO()) : null;
  return `
    ${backBtn()}
    <div class="row">
      <h2 style="margin:0;color:var(--navy)">Plans</h2>
      <button class="text-btn" data-act="open-builder">New</button>
    </div>
    ${
      program
        ? renderProgramCard(program, todaySlot)
        : `<section class="card">
            <div class="meal-title">4-month plan</div>
            <p class="muted">One tap builds 16 weeks of movement from the exercise library.</p>
            <button class="cta-btn" data-act="build-program">Build my 4-month plan</button>
          </section>`
    }
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
            <div class="muted">${esc(p.source === 'ai' ? 'AI coverage' : 'DIY')} · ${(Array.isArray(p.exercises) ? p.exercises : []).length} exercises</div>
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
        : program
          ? ''
          : `<section class="card"><p class="muted">No DIY or AI plans yet.</p><button class="primary-btn" data-act="open-builder">Build a custom plan</button></section>`
    }
  `;
}

function renderProgram(state) {
  const plan = activeProgramPlan(state);
  if (!plan) {
    return `
      ${backBtn()}
      <section class="card">
        <h2 style="margin:0 0 8px;color:var(--navy)">No active plan</h2>
        <p class="muted">Build a 16-week movement plan in one tap.</p>
        <button class="cta-btn" data-act="build-program">Build my 4-month plan</button>
      </section>
    `;
  }
  const doc = programDoc(plan);
  const todaySlot = resolveToday(plan, todayISO());
  const currentIndex = todaySlot && todaySlot.kind !== 'complete' ? todaySlot.index : -1;
  const canStart = todaySlot?.kind === 'ready';
  return `
    ${backBtn()}
    <h2 style="margin:0 0 6px;color:var(--navy)">${esc(plan.name)}</h2>
    <p class="muted" style="margin-top:0">${doc.level ? `${esc(doc.level)} · ` : ''}${doc.daysPerWeek ? `${doc.daysPerWeek} days a week · ` : ''}${esc(doc.split || 'movement')} · 16 weeks</p>
    ${renderPhasePills(doc)}
    ${
      canStart
        ? `<button class="cta-btn" style="margin-bottom:14px" data-act="start-program">Start ${esc(todaySlot.dayName || "today's workout")}</button>`
        : ''
    }
    ${doc.weeks
      .map((week, weekIndex) => {
        const open = todaySlot?.week === week.week;
        return `
          <details class="card week-block" ${open ? 'open' : ''}>
            <summary>Week ${week.week} · ${esc(week.phase)}</summary>
            ${week.days
              .map((day, dayIndex) => {
                const absolute = weekIndex * (week.days.length || 7) + dayIndex;
                const current = absolute === currentIndex;
                return `
                  <div class="program-day ${current ? 'is-current' : ''}">
                    <div class="row">
                      <div class="meal-title">${esc(day.name)}${current ? ' · today' : ''}</div>
                    </div>
                    ${
                      day.rest
                        ? `<p class="muted" style="margin:4px 0 0">Rest</p>`
                        : (day.exercises || [])
                            .map(
                              (ex, exerciseIndex) => `
                      <div class="list-row">
                        <div>
                          <div class="food-name">${esc(ex.name)}</div>
                          <div class="food-meta">${esc(ex.target || bodyPartName(ex.bodyPart))}</div>
                        </div>
                        <button class="text-btn" data-act="swap-exercise" data-week="${weekIndex}" data-day="${dayIndex}" data-i="${exerciseIndex}">Swap</button>
                      </div>`
                            )
                            .join('')
                    }
                  </div>
                `;
              })
              .join('')}
          </details>
        `;
      })
      .join('')}
    <div class="program-actions">
      <button class="steel-btn" data-act="regenerate-program">Regenerate plan</button>
      <button class="danger-btn" data-act="end-program">End plan</button>
    </div>
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
