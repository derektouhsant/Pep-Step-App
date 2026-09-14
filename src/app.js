import { FOODS } from './data/foods.js';
import { EXERCISES, BODY_PARTS, getExercise, exercisesByPart, isCardio } from './data/exercises.js';
import { loadState, saveState, getDay, emptyDay } from './storage.js';
import { esc, uid, todayISO, addDays, round1, num } from './utils.js';
import { icons } from './icons.js';
import { renderDiary, MEALS } from './views/diary.js';
import { renderWorkouts, missingParts } from './views/workouts.js';
import { renderMore } from './views/more.js';

let state = loadState();
const ui = {
  tab: 'diary',
  date: todayISO(),
  workoutView: 'home',
  browsePart: 'chest',
  search: '',
  sheet: null,
  toast: '',
  builder: { name: '', exercises: [], source: 'diy' },
  builderReturn: 'workout',
};

let toastTimer = 0;

function persist() {
  saveState(state);
}

function day() {
  if (!state.diary[ui.date]) {
    state.diary[ui.date] = emptyDay();
  }
  const d = state.diary[ui.date];
  if (!d.meals) d.meals = emptyDay().meals;
  for (const meal of MEALS) {
    if (!Array.isArray(d.meals[meal.id])) d.meals[meal.id] = [];
  }
  if (typeof d.water !== 'number') d.water = 0;
  return d;
}

export function toast(message) {
  ui.toast = message;
  paintToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    ui.toast = '';
    paintToast();
  }, 2200);
}

function paintToast() {
  const el = document.getElementById('toast');
  if (!el) return;
  if (!ui.toast) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = ui.toast;
}

function allFoods() {
  return [...state.customFoods, ...FOODS];
}

function renderSheet() {
  const s = ui.sheet;
  if (!s) return '';

  if (s.type === 'food') return foodSheet(s);
  if (s.type === 'goals') return goalsSheet();
  if (s.type === 'entry') return entrySheet(s);
  if (s.type === 'video') return videoSheet(s);
  if (s.type === 'confirm-finish') return finishSheet();
  if (s.type === 'confirm-reset') return resetSheet();
  return '';
}

function foodSheet(s) {
  const q = (s.query || '').trim().toLowerCase();
  const matches = allFoods()
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .slice(0, 40);
  const selected = s.food;
  const servings = num(s.servings, 1);

  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="row">
          <h3 style="margin:0;color:var(--navy)">Add to ${esc(labelMeal(s.meal))}</h3>
          <button class="text-btn" data-act="close-sheet">Close</button>
        </div>
        ${
          selected
            ? `
          <p class="food-name" style="margin:12px 0 4px">${esc(selected.name)}</p>
          <p class="muted">${esc(selected.serving)} · ${Math.round(selected.calories * servings)} cal · C ${round1(selected.carbs * servings)} · P ${round1(selected.protein * servings)} · F ${round1(selected.fat * servings)}</p>
          <div class="field">
            <label>Servings</label>
            <input data-act="food-servings" inputmode="decimal" value="${esc(s.servings ?? 1)}" />
          </div>
          <button class="primary-btn" data-act="confirm-food">Add food</button>
          <button class="text-btn" style="width:100%;margin-top:8px" data-act="food-back">Back to search</button>
        `
            : `
          <input class="search" data-act="food-query" data-keep="food-query" placeholder="Search foods" value="${esc(s.query || '')}" />
          <div id="food-results">
            ${matches
              .map(
                (f) => `
              <button class="list-row" data-act="pick-food" data-id="${esc(f.id)}">
                <div>
                  <div class="food-name">${esc(f.name)}</div>
                  <div class="food-meta">${esc(f.serving)}${f.custom ? ' · custom' : ''}</div>
                </div>
                <div class="food-cals">${Math.round(f.calories)}</div>
              </button>`
              )
              .join('') || `<p class="muted">No matches. Log a custom food below.</p>`}
          </div>
          <h3 style="margin:16px 0 8px;color:var(--navy)">Custom food</h3>
          <div class="field"><label>Name</label><input data-keep="c-name" placeholder="e.g. Homemade chili" /></div>
          <div class="field"><label>Serving label</label><input data-keep="c-serving" placeholder="e.g. 1 cup" /></div>
          <div class="macro-inputs">
            <div class="field"><label>Calories</label><input data-keep="c-cal" inputmode="decimal" placeholder="250" /></div>
            <div class="field"><label>Carbs (g)</label><input data-keep="c-c" inputmode="decimal" placeholder="20" /></div>
            <div class="field"><label>Protein (g)</label><input data-keep="c-p" inputmode="decimal" placeholder="25" /></div>
            <div class="field"><label>Fat (g)</label><input data-keep="c-f" inputmode="decimal" placeholder="8" /></div>
          </div>
          <button class="primary-btn" data-act="save-custom">Save &amp; add</button>
        `
        }
      </div>
    </div>
  `;
}

function goalsSheet() {
  const g = state.goals;
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="row">
          <h3 style="margin:0;color:var(--navy)">Daily goals</h3>
          <button class="text-btn" data-act="close-sheet">Close</button>
        </div>
        <div class="field"><label>Calories</label><input data-keep="g-cal" inputmode="numeric" value="${esc(g.calories)}" /></div>
        <div class="macro-inputs">
          <div class="field"><label>Carbs (g)</label><input data-keep="g-c" inputmode="numeric" value="${esc(g.carbs)}" /></div>
          <div class="field"><label>Protein (g)</label><input data-keep="g-p" inputmode="numeric" value="${esc(g.protein)}" /></div>
          <div class="field"><label>Fat (g)</label><input data-keep="g-f" inputmode="numeric" value="${esc(g.fat)}" /></div>
          <div class="field"><label>Water (cups)</label><input data-keep="g-w" inputmode="numeric" value="${esc(g.waterCups)}" /></div>
        </div>
        <button class="primary-btn" data-act="save-goals">Save goals</button>
      </div>
    </div>
  `;
}

function entrySheet(s) {
  const item = s.item;
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <h3 style="margin:0 0 8px;color:var(--navy)">${esc(item.name)}</h3>
        <p class="muted">${esc(item.serving)}</p>
        <div class="field"><label>Servings</label><input data-act="entry-servings" inputmode="decimal" value="${esc(item.servings)}" /></div>
        <button class="primary-btn" data-act="save-entry">Update</button>
        <button class="danger" style="width:100%;margin-top:12px" data-act="delete-entry">Remove from diary</button>
      </div>
    </div>
  `;
}

function videoSheet(s) {
  const ex = getExercise(s.id);
  if (!ex) return '';
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="video-thumb"><div class="play">${icons.play}</div></div>
        <h3 style="margin:0;color:var(--navy)">${esc(ex.name)}</h3>
        <p class="muted">${esc(ex.equipment)} · Video coming soon</p>
        <button class="primary-btn" data-act="close-sheet">Close</button>
      </div>
    </div>
  `;
}

function finishSheet() {
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <h3 style="margin:0 0 8px;color:var(--navy)">Finish workout?</h3>
        <p class="muted">Completed sets are saved as previous performance for next time.</p>
        <button class="primary-btn" data-act="confirm-finish">Finish &amp; save</button>
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="close-sheet">Keep going</button>
      </div>
    </div>
  `;
}

function resetSheet() {
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <h3 style="margin:0 0 8px;color:var(--navy)">Clear local data?</h3>
        <p class="muted">This removes diary entries, goals, workouts, and plans stored in this browser.</p>
        <button class="primary-btn" data-act="confirm-reset">Clear data</button>
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="close-sheet">Cancel</button>
      </div>
    </div>
  `;
}

function labelMeal(id) {
  return MEALS.find((m) => m.id === id)?.name || id;
}

function header() {
  const extra =
    ui.tab === 'diary'
      ? `<button class="header-chip" data-act="open-goals">${state.goals.calories} cal</button>`
      : ui.tab === 'workouts' && state.activeWorkout
        ? `<button class="header-chip" data-act="open-logger">Live</button>`
        : '';
  return `
    <header class="app-header">
      <div class="brand">
        <div class="brand-name">PepStep</div>
        <div class="brand-tag">Put a Pep in Your Step</div>
      </div>
      <div class="header-actions">${extra}</div>
    </header>
  `;
}

function tabbar() {
  const tabs = [
    { id: 'diary', label: 'Diary', icon: icons.diary },
    { id: 'workouts', label: 'Workouts', icon: icons.workouts },
    { id: 'more', label: 'More', icon: icons.more },
  ];
  return `
    <nav class="tabbar">
      ${tabs
        .map(
          (t) => `
        <button class="tab ${ui.tab === t.id ? 'active' : ''}" data-act="tab" data-tab="${t.id}">
          ${t.icon}
          <span>${t.label}</span>
        </button>`
        )
        .join('')}
    </nav>
  `;
}

function viewHtml() {
  if (ui.tab === 'workouts') return renderWorkouts(state, ui, EXERCISES);
  if (ui.tab === 'more') return renderMore();
  return renderDiary(state, ui, day());
}

export function render() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-frame">
      ${header()}
      <main class="view">${viewHtml()}</main>
      ${tabbar()}
      ${renderSheet()}
      <div id="toast" class="toast" ${ui.toast ? '' : 'hidden'}>${esc(ui.toast)}</div>
    </div>
  `;
  restoreFocus();
}

function restoreFocus() {
  const keep = ui._keep;
  if (!keep) return;
  const el = document.querySelector(`[data-keep="${keep}"]`);
  if (el && typeof el.focus === 'function') {
    el.focus();
    if (typeof el.setSelectionRange === 'function' && typeof el.value === 'string') {
      const pos = ui._caret ?? el.value.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* ignore */
      }
    }
  }
}

function rememberCaret(target) {
  ui._keep = target.getAttribute('data-keep');
  ui._caret = target.selectionStart;
}

function ensureWorkout() {
  if (!state.activeWorkout) {
    state.activeWorkout = {
      id: uid(),
      name: 'Workout',
      startedAt: Date.now(),
      exercises: [],
    };
    persist();
  }
  return state.activeWorkout;
}

function addExerciseToWorkout(exerciseId) {
  const ex = getExercise(exerciseId);
  if (!ex) return;
  const w = ensureWorkout();
  if (w.exercises.some((e) => e.exerciseId === ex.id)) {
    toast('Already in this workout');
    ui.workoutView = 'logger';
    ui.tab = 'workouts';
    render();
    return;
  }
  const prev = state.lastSets[ex.id];
  const cardio = isCardio(ex);
  const template = {
    weight: prev?.weight ?? '',
    reps: prev?.reps ?? '',
    done: false,
  };
  w.exercises.push({
    exerciseId: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    sets: [{ ...template }, { ...template }, { ...template }],
  });
  persist();
  ui.tab = 'workouts';
  ui.workoutView = 'logger';
  toast(`Added ${ex.name}`);
  render();
}

function addExerciseToBuilder(exerciseId) {
  const ex = getExercise(exerciseId);
  if (!ex) return;
  ui.builder.exercises.push({
    exerciseId: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
  });
  ui.workoutView = 'builder';
  ui.builderReturn = 'workout';
  toast(`Added ${ex.name}`);
  render();
}

function generateAiPlan() {
  const picks = BODY_PARTS.map((part) => {
    const pool = exercisesByPart(part.id);
    return pool[Math.floor(Math.random() * pool.length)];
  });
  ui.builder.source = 'ai';
  if (!ui.builder.name) ui.builder.name = 'AI full-coverage plan';
  ui.builder.exercises = picks.map((ex) => ({
    exerciseId: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
  }));
  toast('AI plan covers every body part');
  render();
}

function startPlan(planId) {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return;
  state.activeWorkout = {
    id: uid(),
    name: plan.name,
    planId: plan.id,
    startedAt: Date.now(),
    exercises: plan.exercises.map((ex) => {
      const prev = state.lastSets[ex.exerciseId];
      const template = { weight: prev?.weight ?? '', reps: prev?.reps ?? '', done: false };
      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyPart,
        sets: [{ ...template }, { ...template }, { ...template }],
      };
    }),
  };
  persist();
  ui.tab = 'workouts';
  ui.workoutView = 'logger';
  ui.sheet = null;
  toast('Workout started');
  render();
}

function finishWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  const finished = { ...w, finishedAt: Date.now() };
  for (const ex of w.exercises || []) {
    const lastDone = [...(ex.sets || [])].reverse().find((s) => s.done && (s.weight !== '' || s.reps !== ''));
    if (lastDone) {
      state.lastSets[ex.exerciseId] = {
        weight: lastDone.weight,
        reps: lastDone.reps,
        date: ui.date,
      };
    }
  }
  state.workoutHistory = [finished, ...(state.workoutHistory || [])].slice(0, 50);
  state.activeWorkout = null;
  persist();
  ui.sheet = null;
  ui.workoutView = 'home';
  toast('Workout saved');
  render();
}

function val(keep) {
  return document.querySelector(`[data-keep="${keep}"]`)?.value ?? '';
}

function onClick(event) {
  const overlay = event.target.closest('.overlay');
  const stop = event.target.closest('[data-stop]');
  if (overlay && !stop) {
    ui.sheet = null;
    render();
    return;
  }

  const btn = event.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;

  const actions = {
    tab() {
      ui.tab = btn.dataset.tab;
      if (ui.tab !== 'workouts') ui.workoutView = ui.workoutView === 'logger' && state.activeWorkout ? 'logger' : ui.workoutView;
      if (ui.tab === 'diary') {
        /* stay */
      }
      render();
    },
    'date-prev'() {
      ui.date = addDays(ui.date, -1);
      render();
    },
    'date-next'() {
      ui.date = addDays(ui.date, 1);
      render();
    },
    'date-today'() {
      ui.date = todayISO();
      render();
    },
    'set-water'() {
      const n = Number(btn.dataset.n);
      const current = day().water || 0;
      day().water = current === n ? n - 1 : n;
      persist();
      render();
    },
    'open-goals'() {
      ui.sheet = { type: 'goals' };
      render();
    },
    'open-food'() {
      ui.sheet = { type: 'food', meal: btn.dataset.meal, query: '', servings: 1, food: null };
      render();
    },
    'close-sheet'() {
      ui.sheet = null;
      render();
    },
    'pick-food'() {
      const food = allFoods().find((f) => f.id === btn.dataset.id);
      if (!food) return;
      ui.sheet = { ...ui.sheet, food, servings: 1 };
      render();
    },
    'food-back'() {
      ui.sheet = { ...ui.sheet, food: null };
      render();
    },
    'confirm-food'() {
      const food = ui.sheet.food;
      const meal = ui.sheet.meal;
      const servings = Math.max(0.1, num(ui.sheet.servings, 1));
      day().meals[meal].push({
        id: uid(),
        foodId: food.id,
        name: food.name,
        serving: food.serving,
        calories: food.calories,
        carbs: food.carbs,
        protein: food.protein,
        fat: food.fat,
        servings,
      });
      persist();
      ui.sheet = null;
      toast(`Added to ${labelMeal(meal)}`);
      render();
    },
    'save-custom'() {
      const name = val('c-name').trim();
      const serving = val('c-serving').trim() || '1 serving';
      const calories = num(val('c-cal'));
      const carbs = num(val('c-c'));
      const protein = num(val('c-p'));
      const fat = num(val('c-f'));
      if (!name) {
        toast('Name this food first');
        return;
      }
      const food = {
        id: `custom-${uid()}`,
        name,
        serving,
        calories,
        carbs,
        protein,
        fat,
        custom: true,
      };
      state.customFoods.unshift(food);
      const meal = ui.sheet.meal;
      day().meals[meal].push({
        id: uid(),
        foodId: food.id,
        name,
        serving,
        calories,
        carbs,
        protein,
        fat,
        servings: 1,
      });
      persist();
      ui.sheet = null;
      toast('Custom food added');
      render();
    },
    'save-goals'() {
      state.goals = {
        calories: Math.max(1, Math.round(num(val('g-cal'), state.goals.calories))),
        carbs: Math.max(0, Math.round(num(val('g-c'), state.goals.carbs))),
        protein: Math.max(0, Math.round(num(val('g-p'), state.goals.protein))),
        fat: Math.max(0, Math.round(num(val('g-f'), state.goals.fat))),
        waterCups: Math.min(16, Math.max(1, Math.round(num(val('g-w'), state.goals.waterCups)))),
      };
      persist();
      ui.sheet = null;
      toast('Goals updated');
      render();
    },
    'edit-entry'() {
      const item = day().meals[btn.dataset.meal].find((i) => i.id === btn.dataset.id);
      if (!item) return;
      ui.sheet = { type: 'entry', meal: btn.dataset.meal, item: { ...item } };
      render();
    },
    'save-entry'() {
      const list = day().meals[ui.sheet.meal];
      const idx = list.findIndex((i) => i.id === ui.sheet.item.id);
      if (idx >= 0) list[idx] = { ...list[idx], servings: Math.max(0.1, num(ui.sheet.item.servings, 1)) };
      persist();
      ui.sheet = null;
      toast('Entry updated');
      render();
    },
    'delete-entry'() {
      const list = day().meals[ui.sheet.meal];
      state.diary[ui.date].meals[ui.sheet.meal] = list.filter((i) => i.id !== ui.sheet.item.id);
      persist();
      ui.sheet = null;
      toast('Removed');
      render();
    },
    'workout-home'() {
      if (ui.builderReturn === 'from-builder') {
        ui.workoutView = 'builder';
        ui.builderReturn = 'workout';
        ui.search = '';
        render();
        return;
      }
      ui.workoutView = 'home';
      ui.search = '';
      render();
    },
    'start-workout'() {
      ensureWorkout();
      ui.workoutView = 'logger';
      render();
    },
    'open-logger'() {
      ensureWorkout();
      ui.tab = 'workouts';
      ui.workoutView = 'logger';
      ui.sheet = null;
      render();
    },
    'open-browse'() {
      ui.workoutView = 'browse';
      ui.search = '';
      ui.builderReturn = 'workout';
      render();
    },
    'open-plans'() {
      ui.workoutView = 'plans';
      render();
    },
    'open-builder'() {
      ui.builder = { name: '', exercises: [], source: 'diy' };
      ui.workoutView = 'builder';
      render();
    },
    'open-videos'() {
      ui.workoutView = 'videos';
      ui.search = '';
      render();
    },
    'set-part'() {
      ui.browsePart = btn.dataset.part;
      render();
    },
    'add-exercise'() {
      if (ui.workoutView === 'browse' && ui.builderReturn === 'from-builder') {
        addExerciseToBuilder(btn.dataset.id);
        return;
      }
      addExerciseToWorkout(btn.dataset.id);
    },
    'builder-browse'() {
      ui.builderReturn = 'from-builder';
      ui.workoutView = 'browse';
      ui.search = '';
      render();
    },
    'builder-source'() {
      ui.builder.source = btn.dataset.source;
      render();
    },
    'builder-remove'() {
      ui.builder.exercises.splice(Number(btn.dataset.i), 1);
      render();
    },
    'ai-generate'() {
      generateAiPlan();
    },
    'save-plan'() {
      const missing = missingParts(ui.builder.exercises);
      if (missing.length) {
        toast('Cover every body part first');
        return;
      }
      const name = (val('plan-name') || ui.builder.name || 'Full coverage plan').trim();
      state.plans.unshift({
        id: uid(),
        name,
        source: ui.builder.source,
        exercises: ui.builder.exercises.slice(),
        createdAt: Date.now(),
      });
      persist();
      ui.workoutView = 'plans';
      toast('Plan saved');
      render();
    },
    'start-plan'() {
      startPlan(btn.dataset.id);
    },
    'delete-plan'() {
      state.plans = state.plans.filter((p) => p.id !== btn.dataset.id);
      persist();
      toast('Plan deleted');
      render();
    },
    'add-set'() {
      const ex = state.activeWorkout.exercises[Number(btn.dataset.ei)];
      const last = ex.sets[ex.sets.length - 1] || { weight: '', reps: '', done: false };
      ex.sets.push({ weight: last.weight, reps: last.reps, done: false });
      persist();
      render();
    },
    'toggle-set'() {
      const set = state.activeWorkout.exercises[Number(btn.dataset.ei)].sets[Number(btn.dataset.si)];
      set.done = !set.done;
      persist();
      render();
    },
    'remove-exercise'() {
      state.activeWorkout.exercises.splice(Number(btn.dataset.ei), 1);
      persist();
      render();
    },
    'finish-workout'() {
      ui.sheet = { type: 'confirm-finish' };
      render();
    },
    'confirm-finish'() {
      finishWorkout();
    },
    'play-video'() {
      ui.sheet = { type: 'video', id: btn.dataset.id };
      render();
    },
    'reset-data'() {
      ui.sheet = { type: 'confirm-reset' };
      render();
    },
    'confirm-reset'() {
      localStorage.removeItem('pepstep:v1');
      state = loadState();
      ui.sheet = null;
      ui.date = todayISO();
      ui.workoutView = 'home';
      toast('Local data cleared');
      render();
    },
  };

  if (actions[act]) {
    event.preventDefault();
    actions[act]();
  }
}

function onInput(event) {
  const el = event.target;
  if (el.matches('[data-keep]')) rememberCaret(el);

  const act = el.dataset.act;
  if (act === 'food-query') {
    ui.sheet.query = el.value;
    rememberCaret(el);
    render();
    return;
  }
  if (act === 'food-servings') {
    ui.sheet.servings = el.value;
    return;
  }
  if (act === 'entry-servings') {
    ui.sheet.item.servings = el.value;
    return;
  }
  if (act === 'search') {
    ui.search = el.value;
    rememberCaret(el);
    render();
    return;
  }
  if (act === 'plan-name') {
    ui.builder.name = el.value;
    return;
  }
  if (act === 'set-field') {
    const ex = state.activeWorkout?.exercises[Number(el.dataset.ei)];
    const set = ex?.sets[Number(el.dataset.si)];
    if (!set) return;
    set[el.dataset.field] = el.value;
    persist();
  }
}

function onKey(event) {
  if (event.key === 'Escape' && ui.sheet) {
    ui.sheet = null;
    render();
  }
}

export function init() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  render();
}
