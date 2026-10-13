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
for (const day of PROGRAM_TEMPLATE.days) {
  for (const entry of day.exercises || []) {
    assert(ids.has(entry.id), `template id missing from library: ${entry.id}`);
    assert(getExercise(entry.id), `getExercise missed ${entry.id}`);
  }
}

const plan = buildProgramPlan({ startDate: '2026-10-13', goals: {}, id: 'plan-1', generation: 10 });
assert(isProgramPlan(plan), 'built plan should be a program');
assert(plan.source === 'program', 'source should be program so it syncs on workout_plans');
assert(plan.exercises.weeks.length === 16, 'plan should have 16 weeks');
assert(plan.exercises.weeks.every((week) => week.days.length === 7), 'each week should have 7 days');
assert(plan.exercises.daysPerWeek === 4, 'placeholder should be 4 training days');
assert(plan.exercises.profile.applied === false, 'nutrition goals should not invent a training split');

const week1 = plan.exercises.weeks[0];
const week5 = plan.exercises.weeks[4];
const week9 = plan.exercises.weeks[8];
const week13 = plan.exercises.weeks[12];
const week16 = plan.exercises.weeks[15];
assert(week1.phase === 'Foundation' && week1.days[0].exercises[0].target === '3 × 10', 'week 1 foundation sets');
assert(week5.phase === 'Build' && week5.days[0].exercises[0].target === '3 × 8', 'week 5 build sets');
assert(week9.phase === 'Strength' && week9.days[0].exercises[0].target === '4 × 6', 'week 9 strength sets');
assert(week13.phase === 'Deload' && week13.days[0].exercises[0].target === '2 × 8', 'week 13 deload sets');
assert(week16.phase === 'Deload' && week16.days[0].exercises[0].reps === '10', 'week 16 deload reps');
assert(week1.days[0].exercises[0].target !== week9.days[0].exercises[0].target, 'weeks should progress, not copy');

const treadmill = week1.days[4].exercises.find((ex) => ex.exerciseId === 'treadmill');
assert(treadmill && treadmill.log === 'treadmill' && treadmill.minutes === 15, 'lower B includes treadmill from the library');
assert(week9.days[4].exercises.find((ex) => ex.log === 'treadmill').minutes === 20, 'cardio minutes should follow the phase');

let slot = resolveToday(plan, '2026-10-13');
assert(slot.kind === 'ready' && slot.dayName === 'Upper A' && slot.week === 1 && !slot.queued, 'start day is upper A');

slot = resolveToday(plan, '2026-10-16');
assert(slot.kind === 'ready' && slot.dayName === 'Upper A' && slot.queued, 'a missed day keeps the same workout queued');

assert(advanceProgram(plan, slot.index, plan.exercises.generation), 'finishing the queued workout should advance');
slot = resolveToday(plan, '2026-10-16');
assert(slot.dayName === 'Lower A' && slot.kind === 'ready', 'next workout becomes the queued session');

assert(advanceProgram(plan, slot.index, 999) === false, 'a regenerated plan should ignore an old session');
assert(plan.exercises.nextIndex === 1, 'rejected finish should not move the cursor');
assert(advanceProgram(plan, slot.index, plan.exercises.generation), 'matching generation should advance');
slot = resolveToday(plan, '2026-10-16');
assert(slot.kind === 'ready' && slot.dayName === 'Upper B', 'a past rest day is skipped and the plan does not break');

const fresh = buildProgramPlan({ startDate: '2026-10-13', goals: {}, id: 'plan-2', generation: 3 });
assert(advanceProgram(fresh, 0, 3), 'complete day 0');
assert(advanceProgram(fresh, 1, 3), 'complete day 1');
slot = resolveToday(fresh, '2026-10-13');
assert(slot.kind === 'rest', 'back-to-back finishes land on the rest day');
slot = resolveToday(fresh, '2026-10-15');
assert(slot.kind === 'rest' && slot.dayName === 'Rest', 'calendar rest day shows rest');
slot = resolveToday(fresh, '2026-10-16');
assert(slot.kind === 'ready' && slot.dayName === 'Upper B', 'the day after rest is the next workout');

const done = buildProgramPlan({ startDate: '2026-01-01', goals: {}, id: 'plan-3', generation: 1 });
done.exercises.nextIndex = 16 * 7;
assert(resolveToday(done, '2026-06-01').kind === 'complete', 'finishing week 16 completes the plan');

const swapped = swapProgramExercise(fresh, { weekIndex: 0, dayIndex: 0, exerciseIndex: 0, exerciseId: 'push-up' });
assert(swapped.name === 'Push-Up' && swapped.sets === 3 && swapped.reps === '10', 'swap keeps the phase prescription');
assert(fresh.exercises.weeks[0].days[0].exercises[0].exerciseId === 'push-up', 'swap writes into the plan document');

const session = sessionExercises(week9.days[0].exercises, { 'barbell-bench-press': { weight: 95, reps: 5 } });
assert(session[0].sets.length === 4, 'logger should preload phase set count');
assert(session[0].sets[0].weight === 95 && session[0].sets[0].reps === 5, 'previous performance prefills the logger');
const cardio = sessionExercises(week1.days[4].exercises, {});
const bout = cardio.find((ex) => ex.log === 'treadmill').sets[0];
assert(bout.durationSec === 15 * 60 && bout.kind === 'treadmill', 'treadmill bout should preload phase minutes');

const row = { exercises: plan.exercises || [] };
const restored = JSON.parse(JSON.stringify(row));
assert(restored.exercises.kind === 'program' && restored.exercises.weeks.length === 16, 'jsonb exercises object should round-trip');
assert(!Array.isArray(restored.exercises), 'program plans are stored as an object, DIY plans stay arrays');

const variantTemplate = {
  ...PROGRAM_TEMPLATE,
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
  expandTemplate({ ...PROGRAM_TEMPLATE, days: PROGRAM_TEMPLATE.days.slice(0, 6) }, { startDate: '2026-10-13' });
} catch {
  threw = true;
}
assert(threw, 'a template that is not 7 days should fail loudly');

console.log('OK: 16-week program builds, queues, advances, and stays in the plan document');
