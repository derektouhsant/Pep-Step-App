import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { getExercise, EXERCISES } = await import(pathToFileURL(path.join(root, 'src/data/exercises.js')).href);
const { PROGRAM_TEMPLATE } = await import(pathToFileURL(path.join(root, 'src/data/programTemplate.js')).href);
const {
  advanceProgram,
  buildProgramPlan,
  expandTemplate,
  isProgramPlan,
  resolveToday,
  sessionExercises,
  swapProgramExercise,
} = await import(pathToFileURL(path.join(root, 'src/program.js')).href);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ids = new Set(EXERCISES.map((ex) => ex.id));
for (const day of PROGRAM_TEMPLATE.cycle) {
  for (const entry of day.exercises || []) {
    assert(ids.has(entry.id), `template id missing from library: ${entry.id}`);
    if (entry.harder) assert(ids.has(entry.harder.id), `harder id missing from library: ${entry.harder.id}`);
  }
}

const plan = buildProgramPlan({
  startDate: '2026-10-13',
  goals: { daysPerWeek: 4 },
  id: 'plan-1',
  generation: 10,
});
assert(plan.name === "Vanessa's Women's Workout", 'plan name should be Vanessa\'s Women\'s Workout');
assert(isProgramPlan(plan), 'built plan should be a program');
assert(plan.source === 'program', 'source should be program so it syncs on workout_plans');
assert(plan.exercises.weeks.length === 16, 'plan should have 16 weeks');
assert(plan.exercises.weeks.every((week) => week.days.length === 7), 'each week should still have 7 queued days');
assert(plan.exercises.level === 'Beginner', 'level should be beginner');
assert(plan.exercises.split === '3 days on, 1 rest', 'rhythm should be 3 on, 1 rest');
assert(plan.exercises.daysPerWeek == null, 'the cycle is not a weekday split');
assert(plan.exercises.profile.applied === false, 'a daysPerWeek goal should not replace this plan');

const week1 = plan.exercises.weeks[0];
const names = week1.days.map((day) => day.name);
assert(names.join('|') === 'Lower body|Upper body & core|Full body|Rest|Lower body|Upper body & core|Full body', 'week 1 follows the rolling cycle');
assert(plan.exercises.weeks[1].days[0].name === 'Rest', 'the cycle continues into the next week instead of restarting on a weekday');

const lower = week1.days[0];
assert(lower.exercises[0].name === 'Bodyweight Squat' && lower.exercises[0].target === '2 × 8', 'week 1 starts with beginner squat volume');
assert(lower.exercises.map((ex) => ex.name).includes('Incline treadmill walk'), 'lower body day ends with an incline treadmill walk');
const incline = lower.exercises.at(-1);
assert(incline.log === 'treadmill' && incline.minutes === 25 && incline.incline === 3 && incline.speed === 2.5, 'week 1 incline walk is 25 minutes');

const upper = week1.days[1];
assert(upper.exercises.some((ex) => ex.name === 'Chair Tricep Dip'), 'chair dips use the library bench dip');
assert(upper.exercises.at(-1).name === 'Easy treadmill walk', 'upper day ends with an easy treadmill walk');
assert(upper.exercises.find((ex) => ex.hold).target === '2 × 15 sec', 'plank uses a beginner hold');

const full = week1.days[2];
const intervals = full.exercises.at(-1);
assert(intervals.name === 'Treadmill intervals' && intervals.bouts.length > 1, 'full body day ends with treadmill intervals');
assert(intervals.bouts.reduce((sum, bout) => sum + bout.minutes, 0) === 25, 'interval bouts add up to the day length');

function treadmillMinutes(week) {
  const day = week.days.find((item) => !item.rest);
  return day.exercises.at(-1).minutes;
}
assert(treadmillMinutes(plan.exercises.weeks[10]) === 45, 'treadmill time reaches 45 minutes by week 11');
assert(treadmillMinutes(plan.exercises.weeks[11]) === 25, 'week 12 recovery shortens the treadmill');
assert(treadmillMinutes(plan.exercises.weeks[12]) === 45, 'weeks 13-15 hold 45 minutes');
assert(treadmillMinutes(plan.exercises.weeks[14]) === 45, 'week 15 still holds 45 minutes');
assert(treadmillMinutes(plan.exercises.weeks[15]) === 25, 'week 16 recovery drops back to 25 minutes');

const week13Lower = plan.exercises.weeks[12].days.find((day) => day.name === 'Lower body');
assert(week13Lower.exercises[1].exerciseId === 'single-leg-glute-bridge', 'later weeks use a harder bridge');
assert(week13Lower.exercises[1].target === '3 × 8', 'the harder bridge uses a smaller rep count');
const week16Lower = plan.exercises.weeks[15].days.find((day) => day.name === 'Lower body');
assert(week16Lower.exercises[1].exerciseId === 'glute-bridge', 'recovery week returns to the easier bridge');
const week13Upper = plan.exercises.weeks[12].days.find((day) => day.name === 'Upper body & core');
assert(week13Upper.exercises[0].exerciseId === 'push-up', 'later weeks move from incline push-ups to push-ups');
const week13Full = plan.exercises.weeks[12].days.find((day) => day.name === 'Full body');
assert(week13Full.exercises.some((ex) => ex.exerciseId === 'burpee'), 'later weeks use a fuller burpee');
assert(week1.days[0].exercises[0].target !== plan.exercises.weeks[8].days[0].exercises[0].target, 'reps and sets progress across weeks');

let slot = resolveToday(plan, '2026-10-13');
assert(slot.kind === 'ready' && slot.dayName === 'Lower body' && slot.week === 1 && !slot.queued, 'start day is lower body');

slot = resolveToday(plan, '2026-10-16');
assert(slot.kind === 'ready' && slot.dayName === 'Lower body' && slot.queued, 'a missed day keeps the same workout queued');

assert(advanceProgram(plan, slot.index, plan.exercises.generation), 'finishing the queued workout should advance');
slot = resolveToday(plan, '2026-10-16');
assert(slot.dayName === 'Upper body & core' && slot.kind === 'ready', 'next workout becomes the queued session');

assert(advanceProgram(plan, slot.index, 999) === false, 'a regenerated plan should ignore an old session');
assert(plan.exercises.nextIndex === 1, 'rejected finish should not move the cursor');

const fresh = buildProgramPlan({ startDate: '2026-10-13', goals: {}, id: 'plan-2', generation: 3 });
assert(advanceProgram(fresh, 0, 3) && advanceProgram(fresh, 1, 3) && advanceProgram(fresh, 2, 3), 'finish the first three workouts');
slot = resolveToday(fresh, '2026-10-13');
assert(slot.kind === 'rest', 'the day after three workouts is rest');
slot = resolveToday(fresh, '2026-10-16');
assert(slot.kind === 'rest' && slot.dayName === 'Rest', 'that rest day shows as rest on its calendar day');
slot = resolveToday(fresh, '2026-10-17');
assert(slot.kind === 'ready' && slot.dayName === 'Lower body', 'a past rest day is skipped and the next workout stays queued');

const done = buildProgramPlan({ startDate: '2026-01-01', goals: {}, id: 'plan-3', generation: 1 });
done.exercises.nextIndex = 16 * 7;
assert(resolveToday(done, '2026-06-01').kind === 'complete', 'finishing week 16 completes the plan');

const swapped = swapProgramExercise(fresh, { weekIndex: 0, dayIndex: 0, exerciseIndex: 0, exerciseId: 'push-up' });
assert(swapped.name === 'Push-Up' && swapped.sets === 2 && swapped.reps === '8', 'swap keeps the week prescription');
assert(fresh.exercises.weeks[0].days[0].exercises[0].exerciseId === 'push-up', 'swap writes into the plan document');

const squatDay = plan.exercises.weeks[8].days.find((day) => day.exercises?.[0]?.exerciseId === 'bodyweight-squat');
const session = sessionExercises(squatDay.exercises, {
  'bodyweight-squat': { weight: '', reps: 10 },
});
assert(session[0].sets.length === 3, 'logger should preload the week set count');
assert(session[0].sets[0].reps === 10, 'previous performance prefills the logger');
const cardio = sessionExercises(lower.exercises, {});
const bout = cardio.find((ex) => ex.name === 'Incline treadmill walk').sets[0];
assert(bout.durationSec === 25 * 60 && bout.incline === 3 && bout.speed === 2.5, 'treadmill wheels preload time, incline, and speed');
const intervalSets = sessionExercises(full.exercises, {}).find((ex) => ex.name === 'Treadmill intervals').sets;
assert(intervalSets.length > 1 && intervalSets.every((set) => set.kind === 'treadmill'), 'intervals preload more than one treadmill bout');

const row = { exercises: plan.exercises || [] };
const restored = JSON.parse(JSON.stringify(row));
assert(restored.exercises.kind === 'program' && restored.exercises.weeks.length === 16, 'jsonb exercises object should round-trip');
assert(!Array.isArray(restored.exercises), 'program plans are stored as an object, DIY plans stay arrays');

const variantTemplate = {
  id: 'days-variant',
  name: 'Variant',
  daysPerWeek: 4,
  split: 'upper-lower',
  days: [
    { name: 'Upper', exercises: [{ id: 'push-up' }] },
    { name: 'Rest', rest: true },
    { name: 'Lower', exercises: [{ id: 'glute-bridge' }] },
    { name: 'Rest', rest: true },
    { name: 'Full', exercises: [{ id: 'treadmill', minutes: 10 }] },
    { name: 'Rest', rest: true },
    { name: 'Rest', rest: true },
  ],
  phases: [{ name: 'Base', weeks: [1, 16], sets: 3, reps: '10', cardioMinutes: 10 }],
  variants: {
    '3': {
      daysPerWeek: 3,
      split: 'full-body',
      days: [
        { name: 'Full A', exercises: [{ id: 'goblet-squat' }] },
        { name: 'Rest', rest: true },
        { name: 'Full B', exercises: [{ id: 'push-up' }] },
        { name: 'Rest', rest: true },
        { name: 'Full C', exercises: [{ id: 'treadmill' }] },
        { name: 'Rest', rest: true },
        { name: 'Rest', rest: true },
      ],
    },
  },
};
const varied = expandTemplate(variantTemplate, {
  startDate: '2026-10-13',
  goals: { daysPerWeek: 3 },
  id: 'varied',
  generation: 1,
});
assert(varied.exercises.profile.applied === true, 'a matching daysPerWeek variant should be applied');
assert(varied.exercises.weeks[0].days[0].name === 'Full A', 'profile daysPerWeek should select the template variant');
assert(varied.exercises.split === 'full-body', 'variant split should be stored on the plan');

let threw = false;
try {
  expandTemplate({ id: 'bad', name: 'Bad', days: variantTemplate.days.slice(0, 6), phases: variantTemplate.phases }, { startDate: '2026-10-13' });
} catch {
  threw = true;
}
assert(threw, 'a template that is not 7 days should fail loudly');

console.log("OK: Vanessa's Women's Workout builds, queues, advances, and stays in the plan document");
