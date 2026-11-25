import { readFileSync } from 'node:fs';
import { mergeStates } from '../src/cloud/merge.js';
import { cloudStateFromTables, getSyncInfo, pushStateToCloud } from '../src/cloud/sync.js';
import {
  addCustomLabel,
  buildCustomExercise,
  buildCustomFood,
  cleanName,
  customExerciseToRow,
  isMissingCustomExercisesTable,
  normalizeCustomExerciseList,
  normalizeCustomFoodList,
  rowToCustomExercise,
  shouldOfferAdd,
} from '../src/customItems.js';
import { buildProgramPlan, programDoc, swapProgramExercise } from '../src/program.js';
import { clearLocalState, defaultState, loadState, saveState } from '../src/storage.js';
import { renderExerciseSheet, renderFoodSheet } from '../src/views/customForm.js';
import { EXERCISES } from '../src/data/exercises.js';
import { renderWorkouts } from '../src/views/workouts.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const BANNED = [
  /\bglp\b/i,
  /\bpeptide/i,
  /\bozempic\b/i,
  /\bmedication/i,
  /\bdos(?:e|ing|age)\b/i,
  /weight[\s-]*loss/i,
  /fat[\s-]*loss/i,
];

function assertClean(label, text) {
  for (const pattern of BANNED) {
    assert(!pattern.test(text), `${label} should not include ${pattern}`);
  }
}

assert(cleanName('  Yard   work  ') === 'Yard work', 'names collapse extra spaces');
assert(buildCustomFood({ id: 'c1', name: '   ' }) == null, 'a blank food name is not saved');
assert(buildCustomExercise({ id: 'e1', name: '' }) == null, 'a blank exercise name is not saved');

const food = buildCustomFood({ id: 'c1', name: 'Homemade chili' });
assert(food.serving === '1 serving', 'a food can be saved with a name only');
assert(food.calories === 0 && food.carbs === 0 && food.protein === 0 && food.fat === 0, 'calories and macros default to zero');
assert(food.custom === true, 'saved foods are marked custom');

const detailed = buildCustomFood({
  id: 'c2',
  name: 'Chili',
  serving: '1 cup',
  calories: '240',
  carbs: -3,
  protein: '18',
  fat: '9',
});
assert(detailed.serving === '1 cup' && detailed.calories === 240 && detailed.carbs === 0, 'optional food fields are kept and negatives are dropped');

const strength = buildCustomExercise({ id: 'e1', name: 'Yard work' });
assert(strength.log === 'strength' && strength.bodyPart === 'full-body', 'an exercise name alone is strength');
const cardio = buildCustomExercise({ id: 'e2', name: 'Pool laps', kind: 'cardio' });
assert(cardio.log === 'duration' && cardio.bodyPart === 'cardio', 'cardio is stored as a duration exercise');
const legs = buildCustomExercise({ id: 'e3', name: 'Suitcase carry', kind: 'strength', bodyPart: 'legs' });
assert(legs.bodyPart === 'legs' && legs.log === 'strength', 'a chosen muscle group is kept');
assert(buildCustomExercise({ id: 'e4', name: 'Nope', bodyPart: 'nope' }).bodyPart === 'full-body', 'unknown muscle groups fall back');

const library = [{ id: 'oats', name: 'Oatmeal' }, food];
assert(shouldOfferAdd(library, 'yard chili') === true, 'a name that is not in the list can be added');
assert(shouldOfferAdd(library, 'oatmeal') === false, 'an exact catalog name is not offered again');
assert(shouldOfferAdd(library, '') === false, 'an empty search uses the plain add custom control');
assert(addCustomLabel('yard chili') === 'Add “yard chili”', 'the button repeats the typed name');
assert(addCustomLabel('') === 'Add custom', 'an empty search says Add custom');

const normalized = normalizeCustomExerciseList([
  { id: 'e1', name: 'Yard work', body_part: 'back', log: 'strength' },
  { id: 'e1', name: 'Duplicate' },
  { name: 'Missing id' },
  null,
]);
assert(normalized.length === 1 && normalized[0].bodyPart === 'back', 'custom exercises normalize and drop duplicates');
assert(normalizeCustomFoodList([{ id: 'c1', name: 'Chili', calories: '12' }])[0].calories === 12, 'custom foods normalize numbers');

const row = customExerciseToRow('user-1', legs, '2026-11-25T00:00:00.000Z');
assert(row.user_id === 'user-1' && row.body_part === 'legs' && row.log === 'strength', 'exercise rows match the table');
assert(rowToCustomExercise(row).name === 'Suitcase carry', 'exercise rows round-trip');

const missing = { code: 'PGRST205', message: "Could not find the table 'public.custom_exercises' in the schema cache" };
const undefinedTable = { code: '42P01', message: 'relation "public.custom_exercises" does not exist' };
assert(isMissingCustomExercisesTable(missing), 'a missing schema-cache table is recognized');
assert(isMissingCustomExercisesTable(undefinedTable), 'a missing postgres relation is recognized');
assert(
  !isMissingCustomExercisesTable({ code: '42501', message: 'permission denied for table custom_exercises' }),
  'permission errors stay visible'
);
assert(
  !isMissingCustomExercisesTable({ code: 'PGRST205', message: "Could not find the table 'public.profiles' in the schema cache" }),
  'a different missing table is not treated as custom exercises'
);

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
const stored = defaultState();
stored.customFoods = [food];
stored.customExercises = [strength];
saveState(stored);
const loaded = loadState();
assert(loaded.customFoods[0].name === 'Homemade chili', 'custom foods stay in localStorage');
assert(loaded.customExercises[0].name === 'Yard work', 'custom exercises stay in localStorage');
clearLocalState();
assert(loadState().customExercises.length === 0, 'clear data removes custom exercises');

const foods = [
  { id: 'oats', name: 'Oatmeal', serving: '1 cup', calories: 150, carbs: 27, protein: 5, fat: 3, custom: false },
  food,
];
const searching = renderFoodSheet({
  mealLabel: 'Lunch',
  sheet: { type: 'food', meal: 'lunch', query: 'yard chili', servings: 1 },
  foods,
});
assert(searching.includes('Add “yard chili”'), 'a food search that misses offers the typed name');
assert(searching.includes('No foods match.'), 'a missed food search says so');
assert(searching.includes('data-act="start-custom-food"'), 'the add control is a button');
assertClean('food search', searching);

const savedFood = renderFoodSheet({
  mealLabel: 'Lunch',
  sheet: { type: 'food', meal: 'lunch', query: 'homemade', servings: 1 },
  foods,
});
assert(savedFood.includes('My item'), 'a saved food is marked My item');
assert(savedFood.includes('data-act="edit-custom-food"'), 'a saved food can be edited');
assert(savedFood.includes('Add “homemade”'), 'a partial food match still offers the exact typed name');

const exact = renderFoodSheet({
  mealLabel: 'Lunch',
  sheet: { type: 'food', meal: 'lunch', query: 'Oatmeal', servings: 1 },
  foods,
});
assert(!exact.includes('Add “Oatmeal”'), 'an exact food match does not offer a duplicate');

const draft = renderFoodSheet({
  mealLabel: 'Lunch',
  sheet: { type: 'food', meal: 'lunch', query: 'yard chili', draft: { name: 'yard chili', serving: '', calories: '' } },
  foods,
});
assert(draft.includes('Name is enough to save'), 'the food form says a name is enough');
assert(draft.includes('Save &amp; add') || draft.includes('Save & add'), 'saving a new food also adds it');
assert(draft.includes('Serving') && draft.includes('Calories'), 'serving and calories are optional fields');
assertClean('food form', draft);

const editing = renderFoodSheet({
  mealLabel: 'Lunch',
  sheet: {
    type: 'food',
    meal: 'lunch',
    draft: { id: 'c1', name: 'Homemade chili', serving: '1 cup', calories: '240', carbs: '', protein: '', fat: '' },
  },
  foods,
});
assert(editing.includes('Delete saved food'), 'a saved food can be deleted');
assert(editing.includes('>Save<'), 'editing a food does not log another copy');

const exerciseForm = renderExerciseSheet({
  sheet: { purpose: 'log', draft: { name: 'Yard work', kind: 'strength', bodyPart: 'full-body' } },
});
assert(exerciseForm.includes('Name is enough to save'), 'the exercise form says a name is enough');
assert(exerciseForm.includes('Strength') && exerciseForm.includes('Cardio'), 'exercise type is strength or cardio');
assert(exerciseForm.includes('Muscle group'), 'muscle group is optional');
assert(exerciseForm.includes('Save &amp; add') || exerciseForm.includes('Save & add'), 'a new exercise is saved and selected');
assertClean('exercise form', exerciseForm);

const exerciseEdit = renderExerciseSheet({
  sheet: { id: 'e1', purpose: 'log', draft: { name: 'Yard work', kind: 'strength', bodyPart: 'full-body' } },
  note: 'Saved on this device. Exercises you add sync to your account after a one-time database update.',
});
assert(exerciseEdit.includes('Delete saved exercise'), 'a saved exercise can be deleted');
assert(exerciseEdit.includes('data-custom-library-note'), 'a missing table explains that the exercise stays on the device');
assertClean('exercise note', exerciseEdit);

const catalog = [strength, ...EXERCISES];
const browse = renderWorkouts(
  defaultState(),
  { workoutView: 'browse', browsePart: 'full-body', search: 'not in the library', builder: { exercises: [] } },
  catalog
);
assert(browse.includes('Add “not in the library”'), 'exercise search offers the typed name');
assert(browse.includes('No exercises match.'), 'a missed exercise search says so');
assertClean('browse', browse);

const mine = renderWorkouts(
  defaultState(),
  { workoutView: 'browse', browsePart: 'full-body', search: '', builder: { exercises: [] } },
  catalog
);
assert(mine.includes('Yard work'), 'a saved exercise shows in its muscle group');
assert(mine.includes('My item'), 'a saved exercise is marked My item');
assert(mine.includes('data-act="edit-custom-exercise"'), 'a saved exercise can be edited from the list');
assert(mine.includes('Add custom'), 'the exercise list offers add custom before a search');

const plan = buildProgramPlan({ startDate: '2026-11-01', goals: {} });
const doc = programDoc(plan);
let slot = null;
for (let week = 0; week < doc.weeks.length && !slot; week += 1) {
  for (let day = 0; day < doc.weeks[week].days.length; day += 1) {
    const entry = doc.weeks[week].days[day];
    if (!entry.rest && entry.exercises?.length) {
      slot = { week, day };
      break;
    }
  }
}
const swapped = swapProgramExercise(plan, {
  weekIndex: slot.week,
  dayIndex: slot.day,
  exerciseIndex: 0,
  exerciseId: strength.id,
  exercise: strength,
});
assert(swapped?.name === 'Yard work' && swapped.exerciseId === 'e1', 'a custom exercise can be swapped into a plan');
assert(!EXERCISES.some((item) => item.id === 'e1'), 'the custom exercise is not part of the built-in library');

const calls = [];
function fakeClient(resultFor) {
  return {
    from(table) {
      const builder = {
        select() {
          calls.push(`${table}.select`);
          return builder;
        },
        eq() {
          return builder;
        },
        in() {
          return Promise.resolve({ data: [], error: null });
        },
        upsert() {
          calls.push(`${table}.upsert`);
          return Promise.resolve(resultFor(table, 'upsert'));
        },
        delete() {
          calls.push(`${table}.delete`);
          return builder;
        },
        maybeSingle() {
          return Promise.resolve(resultFor(table, 'single'));
        },
        then(resolve, reject) {
          return Promise.resolve(resultFor(table, 'select')).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

function tableResult(table, op) {
  if (table === 'custom_exercises') return { data: null, error: missing };
  if (table === 'profiles' && op === 'single') {
    return { data: { goals: { calories: 1800 }, last_sets: {} }, error: null };
  }
  if (table === 'diary_days') return { data: [{ day: '2026-11-01', water: 3, meals: {} }], error: null };
  return { data: [], error: null };
}

const cloud = await cloudStateFromTables(fakeClient(tableResult), 'user-1');
assert(cloud.diary['2026-11-01'].water === 3, 'diary still loads when custom exercises are not installed');
assert(cloud.goals.calories === 1800, 'profile still loads when custom exercises are not installed');
assert(cloud.customExercises.length === 0, 'a missing exercise table does not invent rows');
assert(getSyncInfo().customExercisesRemote === false, 'the app remembers that custom exercises are local only');

calls.length = 0;
const state = defaultState();
state.customExercises = [strength];
state.plans = [{ id: 'p1', name: 'Home', source: 'diy', exercises: [], createdAt: Date.now() }];
await pushStateToCloud(fakeClient(tableResult), 'user-1', state);
assert(calls.includes('custom_exercises.upsert'), 'signed-in custom exercises attempt to sync');
assert(calls.includes('workout_plans.upsert'), 'a missing custom exercise table does not block plan sync');
assert(getSyncInfo().customExercisesRemote === false, 'a failed exercise save stays on the device');

const mergedLocal = mergeStates(
  { ...defaultState(), customExercises: [strength] },
  { ...defaultState(), customExercises: [] }
);
assert(mergedLocal.customExercises.length === 1, 'local custom exercises survive an empty cloud list');

const sql = readFileSync(new URL('../supabase/migrations/004_custom_exercises.sql', import.meta.url), 'utf8');
for (const phrase of [
  'create table if not exists public.custom_exercises',
  'auth.uid() = user_id',
  'grant select, insert, update, delete on table public.custom_exercises to authenticated',
  'revoke all on table public.custom_exercises from anon',
  'on delete cascade',
  'notify pgrst',
]) {
  assert(sql.includes(phrase), `migration should include: ${phrase}`);
}
assert(!/service_role/i.test(sql), 'the migration does not mention a service role key');

console.log('custom item checks ok');
