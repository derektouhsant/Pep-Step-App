import { emptyDay, getDay } from '../storage.js';
import {
  addDays,
  esc,
  formatDuration,
  formatFullDate,
  formatWhen,
  isoFromTs,
  todayISO,
  weekdayLetter,
} from '../utils.js';
import { dayTotals, MEALS, renderEnergyBlock } from './diary.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function viewDay(state, iso) {
  const d = getDay(state, iso) || emptyDay();
  const base = emptyDay();
  return {
    water: typeof d.water === 'number' ? d.water : 0,
    meals: { ...base.meals, ...(d.meals || {}) },
  };
}

function mealCalories(items) {
  return (items || []).reduce((n, item) => n + item.calories * (Number(item.servings) || 0), 0);
}

export function dayHasMeals(day) {
  return MEALS.some((meal) => (day?.meals?.[meal.id] || []).length > 0);
}

export function isActiveDay(state, iso) {
  return dayHasMeals(viewDay(state, iso)) || workoutDaySet(state).has(iso);
}

export function firstEmptyMeal(day) {
  return MEALS.find((meal) => !(day?.meals?.[meal.id] || []).length)?.id || 'breakfast';
}

export function workoutDaySet(state) {
  const set = new Set();
  for (const w of state.workoutHistory || []) {
    if (w.finishedAt) set.add(isoFromTs(w.finishedAt));
  }
  if (state.activeWorkout?.startedAt) set.add(isoFromTs(state.activeWorkout.startedAt));
  return set;
}

export function lastSevenDays(today) {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}

export function movementStreak(state, today) {
  let cursor = today;
  if (!isActiveDay(state, today)) {
    cursor = addDays(today, -1);
    if (!isActiveDay(state, cursor)) return 0;
  }
  let n = 0;
  while (isActiveDay(state, cursor) && n < 365) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function todayWorkoutStatus(state, today) {
  const active = state.activeWorkout;
  if (active) {
    return { kind: 'progress', label: 'In progress', workout: active };
  }
  const finishedToday = (state.workoutHistory || []).find((w) => w.finishedAt && isoFromTs(w.finishedAt) === today);
  if (finishedToday) {
    return { kind: 'done', label: 'Finished', workout: finishedToday };
  }
  return { kind: 'none', label: 'None yet', workout: null };
}

function lastWorkout(state) {
  if (state.activeWorkout) return state.activeWorkout;
  return (state.workoutHistory || [])[0] || null;
}

function mealSnapshot(day) {
  const logged = MEALS.filter((meal) => (day.meals[meal.id] || []).length > 0);
  if (!logged.length) {
    return `
      <p class="empty-meal">Nothing logged yet</p>
      <button class="add-food" data-act="home-log-food">Log food in Diary</button>
    `;
  }
  return `
    <div class="home-meals">
      ${MEALS.map((meal) => {
        const items = day.meals[meal.id] || [];
        const count = items.length;
        const cals = Math.round(mealCalories(items));
        return `
          <button class="home-meal" data-act="home-open-meal" data-meal="${esc(meal.id)}">
            <span>
              <span class="food-name">${esc(meal.name)}</span>
              <span class="food-meta">${count ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Not logged'}</span>
            </span>
            <span class="food-cals">${count ? `${cals}` : '—'}</span>
          </button>`;
      }).join('')}
    </div>
  `;
}

function workoutCard(state, today) {
  const status = todayWorkoutStatus(state, today);
  const last = lastWorkout(state);
  const lastLine = last
    ? status.kind === 'progress'
      ? `Started ${esc(formatWhen(last.startedAt))} · ${(last.exercises || []).length} exercises`
      : `${esc(last.name || 'Workout')} · ${esc(formatWhen(last.finishedAt || last.startedAt))}${
          last.finishedAt && last.startedAt ? ` · ${esc(formatDuration(last.finishedAt - last.startedAt))}` : ''
        }`
    : 'No sessions yet. Start whenever you are ready.';

  if (status.kind === 'progress') {
    return `
      <section class="card hero-card">
        <div class="row">
          <div class="tiny">Workouts</div>
          <span class="status-pill live">${esc(status.label)}</span>
        </div>
        <h3 class="home-card-title">${esc(activeName(state))}</h3>
        <p class="muted">${lastLine}</p>
        <div class="grid-2" style="margin-top:12px">
          <button class="steel-btn" data-act="open-logger">Resume</button>
          <button class="steel-btn" data-act="go-workouts" style="background:transparent;border:1px solid rgba(255,255,255,.35)">Open Workouts</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="row">
        <div class="tiny">Workouts</div>
        <span class="status-pill ${status.kind}">${esc(status.label)}</span>
      </div>
      <h3 class="home-card-title">${status.kind === 'done' ? 'Session in the books' : 'Ready when you are'}</h3>
      <p class="muted">${lastLine}</p>
      <button class="${status.kind === 'done' ? 'steel-btn' : 'primary-btn'}" style="width:100%;margin-top:12px" data-act="start-workout">${
        status.kind === 'done' ? 'Start another' : 'Start workout'
      }</button>
      <button class="text-btn" style="width:100%;margin-top:8px" data-act="go-workouts">Open Workouts</button>
    </section>
  `;
}

function activeName(state) {
  return state.activeWorkout?.name || 'Workout';
}

function weekCard(state, today) {
  const days = lastSevenDays(today);
  const activeCount = days.filter((iso) => isActiveDay(state, iso)).length;
  const streak = movementStreak(state, today);
  const streakLine =
    streak > 0
      ? `${streak} day${streak === 1 ? '' : 's'} in a row`
      : 'Log a meal or a session to start a streak';

  return `
    <section class="card">
      <div class="row">
        <div>
          <div class="tiny">This week</div>
          <div class="meal-title">Movement glance</div>
        </div>
        <div class="cup-count" style="margin:0">${activeCount}/7 days</div>
      </div>
      <p class="muted" style="margin:6px 0 0">${esc(streakLine)}</p>
      <div class="week-row">
        ${days
          .map((iso) => {
            const on = isActiveDay(state, iso);
            const isToday = iso === today;
            return `
              <button class="week-day ${on ? 'on' : ''} ${isToday ? 'today' : ''}" data-act="go-diary-date" data-date="${esc(iso)}" aria-label="${esc(formatFullDate(iso))}">
                <span>${esc(weekdayLetter(iso))}</span>
                <span class="week-dot"></span>
              </button>`;
          })
          .join('')}
      </div>
    </section>
  `;
}

export function renderHome(state) {
  const today = todayISO();
  const day = viewDay(state, today);
  const totals = dayTotals(day);
  const cups = Math.max(1, Number(state.goals.waterCups) || 8);
  const water = Number(day.water) || 0;
  const waterPct = cups > 0 ? Math.min(100, (water / cups) * 100) : 0;

  return `
    <div class="home-hello">
      <div class="tiny">${esc(greeting())}</div>
      <h2>${esc(formatFullDate(today))}</h2>
      <p class="muted">Longevity is Movement.</p>
    </div>

    <section class="card">
      <div class="row">
        <span class="tiny">Nutrition</span>
        <button class="text-btn" data-act="go-diary">Open Diary</button>
      </div>
      ${renderEnergyBlock(totals, state.goals)}
      <button class="home-water" data-act="go-diary">
        <span>Water</span>
        <div class="macro-track"><div class="macro-fill light" style="width:${waterPct}%"></div></div>
        <span class="macro-nums">${water}/${cups} cups</span>
      </button>
      ${mealSnapshot(day)}
    </section>

    ${workoutCard(state, today)}
    ${weekCard(state, today)}
  `;
}
