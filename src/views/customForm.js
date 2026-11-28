import { BODY_PARTS, bodyPartName } from '../data/exercises.js';
import {
  addCustomLabel,
  cleanName,
  exerciseKindLabel,
  shouldOfferAdd,
} from '../customItems.js';
import { esc, round1 } from '../utils.js';

export function renderMineTag() {
  return '<span class="mine-tag">My item</span>';
}

export function renderAddCustomButton({ act, query, quiet = false }) {
  const name = cleanName(query);
  const cls = quiet ? 'add-custom quiet' : 'add-custom';
  return `<button type="button" class="${cls}" data-act="${esc(act)}" data-name="${esc(name)}">${esc(addCustomLabel(name))}</button>`;
}

function macroSummary(food) {
  const cal = Math.round(Number(food.calories) || 0);
  const protein = round1(Number(food.protein) || 0);
  const carbs = round1(Number(food.carbs) || 0);
  const fat = round1(Number(food.fat) || 0);
  return `${cal} cal · P ${protein}g · C ${carbs}g · F ${fat}g`;
}

function foodRow(food) {
  const mine = food.custom ? renderMineTag() : '';
  const side = food.custom
    ? `<button type="button" class="text-btn" data-act="edit-custom-food" data-id="${esc(food.id)}">Edit</button>`
    : `<div class="food-cals">${Math.round(Number(food.calories) || 0)}</div>`;
  const meta = food.custom ? `${food.serving} · ${macroSummary(food)}` : food.serving;
  return `
    <div class="list-row">
      <button type="button" class="list-hit" data-act="pick-food" data-id="${esc(food.id)}">
        <div class="food-name">${esc(food.name)}${mine}</div>
        <div class="food-meta">${esc(meta)}</div>
      </button>
      ${side}
    </div>`;
}

function draftField(id, label, value, placeholder, extra = '') {
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" data-keep="${id}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" ${extra} />
    </div>`;
}

function deleteBlock({ asking, askAct, confirmAct, noun, kept }) {
  if (!asking) {
    return `<button type="button" class="danger" data-act="${askAct}">Delete saved ${noun}</button>`;
  }
  return `
    <p class="muted">Delete this saved ${noun}? ${kept}</p>
    <button type="button" class="danger-btn" data-act="${confirmAct}">Delete</button>
    <button type="button" class="text-btn" style="width:100%;margin-top:8px" data-act="cancel-delete-custom">Cancel</button>`;
}

export function renderFoodSheet({ mealLabel, sheet, foods }) {
  const selected = sheet.food;
  const servings = Number(sheet.servings);
  const shownServings = Number.isFinite(servings) && servings > 0 ? servings : 1;
  if (sheet.draft) return renderFoodDraft(mealLabel, sheet);
  if (selected) {
    return `
      <div class="overlay" data-act="close-sheet">
        <div class="sheet" data-stop>
          <div class="grab"></div>
          <div class="row">
            <h3 style="margin:0;color:var(--navy)">Add to ${esc(mealLabel)}</h3>
            <button type="button" class="text-btn" data-act="close-sheet">Close</button>
          </div>
          <p class="food-name" style="margin:12px 0 4px">${esc(selected.name)}${selected.custom ? renderMineTag() : ''}</p>
          <p class="muted">${esc(selected.serving)} · ${Math.round(selected.calories * shownServings)} cal · C ${round1(selected.carbs * shownServings)} · P ${round1(selected.protein * shownServings)} · F ${round1(selected.fat * shownServings)}</p>
          <div class="field">
            <label for="food-servings">Servings</label>
            <input id="food-servings" data-act="food-servings" data-keep="food-servings" inputmode="decimal" value="${esc(sheet.servings ?? 1)}" />
          </div>
          <button type="button" class="primary-btn" data-act="confirm-food">Add food</button>
          <button type="button" class="text-btn" style="width:100%;margin-top:8px" data-act="food-back">Back to search</button>
        </div>
      </div>`;
  }
  return renderFoodSearch(mealLabel, sheet, foods);
}

function renderFoodSearch(mealLabel, sheet, foods) {
  const query = sheet.query || '';
  const q = query.trim().toLowerCase();
  const matches = (foods || [])
    .filter((food) => !q || String(food.name || '').toLowerCase().includes(q))
    .slice(0, 40);
  const typed = cleanName(query);
  const add = typed
    ? shouldOfferAdd(foods, query)
      ? renderAddCustomButton({ act: 'start-custom-food', query })
      : ''
    : renderAddCustomButton({ act: 'start-custom-food', query: '', quiet: true });
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="row">
          <h3 style="margin:0;color:var(--navy)">Add to ${esc(mealLabel)}</h3>
          <button type="button" class="text-btn" data-act="close-sheet">Close</button>
        </div>
        <input class="search" data-act="food-query" data-keep="food-query" placeholder="Search foods" value="${esc(query)}" />
        ${add}
        <div id="food-results">
          ${
            matches.length
              ? matches.map((food) => foodRow(food)).join('')
              : `<p class="muted">${q ? 'No foods match.' : 'Search the list, or add your own.'}</p>`
          }
        </div>
      </div>
    </div>`;
}

function macroInput(id, label, value) {
  return `
    <div class="field macro-field">
      <label for="${id}">${label}</label>
      <input id="${id}" data-keep="${id}" type="number" min="0" step="any" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="${esc(value ?? '')}" />
    </div>`;
}

function renderFoodDraft(mealLabel, sheet) {
  const draft = sheet.draft || {};
  const editing = Boolean(draft.id);
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="row">
          <h3 style="margin:0;color:var(--navy)">${editing ? 'Edit food' : `Add to ${esc(mealLabel)}`}</h3>
          <button type="button" class="text-btn" data-act="food-draft-back">Back</button>
        </div>
        <p class="muted">Name is required. Macros are for one serving and can be left blank.</p>
        <form data-custom-food>
          ${draftField('c-name', 'Name', draft.name, 'e.g. Homemade chili')}
          <section class="macro-panel" data-macro-panel>
            <h4>Macros per serving</h4>
            ${draftField('c-serving', 'Serving size', draft.serving, 'e.g. 1 cup, 100 g')}
            ${macroInput('c-cal', 'Calories', draft.calories)}
            <div class="macro-inputs macros-3">
              ${macroInput('c-p', 'Protein (g)', draft.protein)}
              ${macroInput('c-c', 'Carbs (g)', draft.carbs)}
              ${macroInput('c-f', 'Fat (g)', draft.fat)}
            </div>
            ${editing ? '' : macroInput('c-qty', 'How many servings', draft.quantity ?? '1')}
            ${sheet.macroError ? `<p class="warn" data-macro-error>${esc(sheet.macroError)}</p>` : ''}
          </section>
          <button type="button" class="primary-btn" data-act="save-custom">${editing ? 'Save' : 'Save & add'}</button>
        </form>
        ${
          editing
            ? deleteBlock({
                asking: sheet.confirmDelete,
                askAct: 'ask-delete-custom',
                confirmAct: 'delete-custom-food',
                noun: 'food',
                kept: 'Meals you already logged stay as they are.',
              })
            : ''
        }
      </div>
    </div>`;
}

export function renderExerciseRows(list, { action = 'add-exercise', actionLabel = 'Add' } = {}) {
  return (list || [])
    .map((exercise) => {
      const custom = Boolean(exercise.custom);
      const meta = custom
        ? `${exerciseKindLabel(exercise)} · ${bodyPartName(exercise.bodyPart)}`
        : `${exercise.equipment || 'Other'} · ${bodyPartName(exercise.bodyPart)}${
            exercise.log === 'treadmill' ? ' · Incline, speed, time' : ''
          }`;
      const edit = custom
        ? `<button type="button" class="text-btn" data-act="edit-custom-exercise" data-id="${esc(exercise.id)}">Edit</button>`
        : '';
      return `
        <div class="list-row">
          <div class="list-copy">
            <div class="food-name">${esc(exercise.name)}${custom ? renderMineTag() : ''}</div>
            <div class="food-meta">${esc(meta)}</div>
          </div>
          <div class="row-actions">
            ${edit}
            <button type="button" class="steel-btn" data-act="${esc(action)}" data-id="${esc(exercise.id)}">${esc(actionLabel)}</button>
          </div>
        </div>`;
    })
    .join('');
}

export function renderExerciseAddSlot({ query, pool, act = 'start-custom-exercise' }) {
  const typed = cleanName(query);
  if (typed && shouldOfferAdd(pool, typed)) return renderAddCustomButton({ act, query: typed });
  if (!typed) return renderAddCustomButton({ act, query: '', quiet: true });
  return '';
}

function exerciseSaveLabel(sheet) {
  if (sheet.id) return 'Save';
  if (sheet.purpose === 'swap') return 'Save & swap';
  if (sheet.purpose === 'video') return 'Save';
  return 'Save & add';
}

export function renderExerciseSheet({ sheet, note = '' }) {
  const draft = sheet.draft || {};
  const editing = Boolean(sheet.id);
  const kind = draft.kind === 'cardio' ? 'cardio' : 'strength';
  const part = draft.bodyPart || (kind === 'cardio' ? 'cardio' : 'full-body');
  return `
    <div class="overlay" data-act="close-sheet">
      <div class="sheet" data-stop>
        <div class="grab"></div>
        <div class="row">
          <h3 style="margin:0;color:var(--navy)">${editing ? 'Edit exercise' : 'Add exercise'}</h3>
          <button type="button" class="text-btn" data-act="close-custom-exercise">Back</button>
        </div>
        <p class="muted">Name is enough to save. Type and muscle group are optional.</p>
        ${note ? `<p class="muted" data-custom-library-note>${esc(note)}</p>` : ''}
        <form data-custom-exercise>
          ${draftField('c-name', 'Name', draft.name, 'e.g. Yard work')}
          <div class="field">
            <label>Type</label>
            <div class="choice-row">
              <button type="button" class="part-chip ${kind === 'strength' ? 'active' : ''}" data-act="custom-kind" data-kind="strength">Strength</button>
              <button type="button" class="part-chip ${kind === 'cardio' ? 'active' : ''}" data-act="custom-kind" data-kind="cardio">Cardio</button>
            </div>
          </div>
          <div class="field">
            <label>Muscle group</label>
            <div class="part-grid">
              ${BODY_PARTS.map(
                (item) =>
                  `<button type="button" class="part-chip ${item.id === part ? 'active' : ''}" data-act="custom-part" data-part="${esc(item.id)}">${esc(item.name)}</button>`
              ).join('')}
            </div>
          </div>
          <button type="button" class="primary-btn" data-act="save-custom-exercise">${exerciseSaveLabel(sheet)}</button>
        </form>
        ${
          editing
            ? deleteBlock({
                asking: sheet.confirmDelete,
                askAct: 'ask-delete-custom',
                confirmAct: 'delete-custom-exercise',
                noun: 'exercise',
                kept: 'Workouts you already logged stay as they are.',
              })
            : ''
        }
      </div>
    </div>`;
}
