import { esc, formatPrettyDate, round1 } from '../utils.js';

const MEALS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
  { id: 'snacks', name: 'Snacks' },
];

const CIRC = 2 * Math.PI * 52;

export function dayTotals(day) {
  const totals = { calories: 0, carbs: 0, protein: 0, fat: 0 };
  for (const meal of MEALS) {
    for (const item of day?.meals?.[meal.id] || []) {
      const s = Number(item.servings) || 0;
      totals.calories += item.calories * s;
      totals.carbs += item.carbs * s;
      totals.protein += item.protein * s;
      totals.fat += item.fat * s;
    }
  }
  return totals;
}

export function calorieProgress(totals, goals) {
  const left = Math.round(goals.calories - totals.calories);
  const pct = goals.calories > 0 ? Math.min(1, totals.calories / goals.calories) : 0;
  return { left, pct, offset: CIRC * (1 - pct), circ: CIRC };
}

export function macroBar(label, used, goal, tone) {
  const pct = goal > 0 ? Math.min(100, (used / goal) * 100) : 0;
  return `
    <div class="macro-row">
      <span>${esc(label)}</span>
      <div class="macro-track"><div class="macro-fill ${tone}" style="width:${pct}%"></div></div>
      <span class="macro-nums">${Math.round(used)}/${goal}g</span>
    </div>
  `;
}

export function renderEnergyBlock(totals, goals) {
  const { left, offset, circ } = calorieProgress(totals, goals);
  return `
      <div class="summary">
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="ring-bg" cx="60" cy="60" r="52"></circle>
            <circle class="ring-fg" cx="60" cy="60" r="52" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
          </svg>
          <div class="ring-center">
            <div class="ring-num">${left >= 0 ? left : Math.abs(left)}</div>
            <div class="ring-sub">${left >= 0 ? 'cals left' : 'over'}</div>
          </div>
        </div>
        <div class="macros">
          ${macroBar('Carbs', totals.carbs, goals.carbs, '')}
          ${macroBar('Protein', totals.protein, goals.protein, 'steel')}
          ${macroBar('Fat', totals.fat, goals.fat, 'light')}
        </div>
      </div>
  `;
}

function mealCard(meal, items) {
  const cals = items.reduce((n, i) => n + i.calories * (Number(i.servings) || 0), 0);
  const rows = items.length
    ? items
        .map(
          (item) => `
      <div class="food-item">
        <button class="linkish" data-act="edit-entry" data-meal="${meal.id}" data-id="${esc(item.id)}">
          <div class="food-name">${esc(item.name)}</div>
          <div class="food-meta">${esc(item.servings)} × ${esc(item.serving)} · C ${round1(item.carbs * item.servings)} · P ${round1(item.protein * item.servings)} · F ${round1(item.fat * item.servings)}</div>
        </button>
        <div class="food-cals">${Math.round(item.calories * item.servings)}</div>
      </div>`
        )
        .join('')
    : `<p class="empty-meal">Nothing logged yet</p>`;

  return `
    <section class="card">
      <div class="meal-head">
        <div class="meal-title">${esc(meal.name)}</div>
        <div class="muted">${Math.round(cals)} cal</div>
      </div>
      ${rows}
      <button class="add-food" data-act="open-food" data-meal="${meal.id}">+ Add food</button>
    </section>
  `;
}

export function renderDiary(state, ui, day) {
  const totals = dayTotals(day);
  const cups = Math.max(1, Number(state.goals.waterCups) || 8);
  const water = Number(day.water) || 0;

  const cupBtns = Array.from({ length: cups }, (_, i) => {
    const n = i + 1;
    return `<button class="cup ${water >= n ? 'filled' : ''}" data-act="set-water" data-n="${n}" aria-label="Set water to ${n} cups"></button>`;
  }).join('');

  return `
    <div class="date-nav">
      <button class="icon-btn" data-act="date-prev" aria-label="Previous day" style="background:var(--navy)">${iconsMini('left')}</button>
      <button class="date-label text-btn" data-act="date-today">${esc(formatPrettyDate(ui.date))}</button>
      <button class="icon-btn" data-act="date-next" aria-label="Next day" style="background:var(--navy)">${iconsMini('right')}</button>
    </div>

    <section class="card">
      <div class="row">
        <span class="tiny">Energy</span>
        <button class="text-btn" data-act="open-goals">Edit goals</button>
      </div>
      ${renderEnergyBlock(totals, state.goals)}
    </section>

    <section class="card">
      <div class="row">
        <div>
          <div class="tiny">Hydration</div>
          <div class="meal-title">Water</div>
        </div>
        <div class="cup-count">${water} / ${cups} cups</div>
      </div>
      <div class="water-grid">${cupBtns}</div>
    </section>

    ${MEALS.map((meal) => mealCard(meal, day.meals[meal.id] || [])).join('')}
  `;
}

function iconsMini(dir) {
  if (dir === 'left') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>`;
}

export { MEALS };
