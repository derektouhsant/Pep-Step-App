import { mergeStates, mergeDiary, mergeGoals, mergeById, DEFAULT_GOALS } from '../src/cloud/merge.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const local = {
  goals: { ...DEFAULT_GOALS, protein: 200 },
  diary: {
    '2026-09-16': {
      water: 2,
      meals: {
        breakfast: [{ id: 'a', name: 'Eggs' }],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    },
  },
  customFoods: [{ id: 'c1', name: 'Chili' }],
  workoutHistory: [{ id: 'w1', name: 'Push', finishedAt: 100, startedAt: 1 }],
  plans: [{ id: 'p1', name: 'A' }],
  lastSets: { bench: { weight: 95, date: '2026-09-16' } },
  activeWorkout: { id: 'live', startedAt: 50, name: 'Live' },
};

const cloud = {
  goals: { ...DEFAULT_GOALS, calories: 1800 },
  diary: {
    '2026-09-16': {
      water: 6,
      meals: {
        breakfast: [{ id: 'b', name: 'Oats' }],
        lunch: [{ id: 'c', name: 'Salad' }],
        dinner: [],
        snacks: [],
      },
    },
    '2026-09-15': {
      water: 8,
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    },
  },
  customFoods: [{ id: 'c2', name: 'Soup' }],
  workoutHistory: [{ id: 'w2', name: 'Pull', finishedAt: 200, startedAt: 10 }],
  plans: [{ id: 'p2', name: 'B' }],
  lastSets: { bench: { weight: 135, date: '2026-09-17' }, squat: { weight: 185, date: '2026-09-15' } },
  activeWorkout: { id: 'w1', startedAt: 1, name: 'Old live' },
};

const merged = mergeStates(local, cloud);

assert(merged.goals.protein === 200, 'local customized protein should win over default cloud protein');
assert(merged.goals.calories === 1800, 'cloud customized calories should survive when local uses default calories');
assert(merged.diary['2026-09-16'].water === 6, 'water should use max cups');
assert(merged.diary['2026-09-16'].meals.breakfast.length === 2, 'breakfast items should union by id');
assert(merged.diary['2026-09-15'].water === 8, 'cloud-only diary day should appear');
assert(merged.customFoods.length === 2, 'custom foods should union');
assert(merged.workoutHistory.map((w) => w.id).join(',') === 'w2,w1', 'history should union and sort newest first');
assert(merged.plans.length === 2, 'plans should union');
assert(merged.lastSets.bench.weight === 135, 'newer last-set should win');
assert(merged.lastSets.squat.weight === 185, 'cloud-only last-set should appear');
assert(merged.activeWorkout.id === 'live', 'finished cloud session should not replace local active workout');

const byId = mergeById([{ id: '1', n: 'local' }], [{ id: '1', n: 'cloud' }, { id: '2', n: 'other' }]);
assert(byId.find((x) => x.id === '1').n === 'local', 'local id should win on conflict');
assert(byId.length === 2, 'mergeById should keep unique ids');

const diary = mergeDiary({}, { '2026-01-01': { water: 1, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } } });
assert(diary['2026-01-01'].water === 1, 'empty local diary should take cloud days');

const g = mergeGoals(DEFAULT_GOALS, { ...DEFAULT_GOALS, fat: 90 });
assert(g.fat === 90, 'cloud non-default goals should replace local defaults');

console.log('OK: merge helpers union diary, workouts, and goals');
