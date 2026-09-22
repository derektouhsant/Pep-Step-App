import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { FOODS } = await import(pathToFileURL(path.join(root, 'src/data/foods.js')).href);
const { EXERCISES, BODY_PARTS, exercisesByPart } = await import(
  pathToFileURL(path.join(root, 'src/data/exercises.js')).href
);
const {
  INCLINE_VALUES,
  SPEED_VALUES,
  MINUTE_VALUES,
  SECOND_VALUES,
  treadmillBout,
  formatBout,
  isTreadmillBlock,
  workoutTreadmillLines,
  workoutSummary,
} = await import(pathToFileURL(path.join(root, 'src/data/treadmill.js')).href);

const foodCount = FOODS.length;
const exCount = EXERCISES.length;

if (foodCount < 80) {
  throw new Error(`Expected at least 80 sample foods, got ${foodCount}`);
}
if (exCount < 100 || exCount > 250) {
  throw new Error(`Expected 100–250 exercises, got ${exCount}`);
}

const missing = BODY_PARTS.filter((p) => exercisesByPart(p.id).length === 0);
if (missing.length) {
  throw new Error(`Missing exercises for: ${missing.map((p) => p.id).join(', ')}`);
}

if (FOODS.some((f) => !f.name || Number.isNaN(f.calories))) {
  throw new Error('Food data is malformed');
}

const treadmill = EXERCISES.find((e) => e.id === 'treadmill');
if (!treadmill || treadmill.log !== 'treadmill' || treadmill.bodyPart !== 'cardio') {
  throw new Error('Treadmill exercise missing from the cardio list');
}
if (INCLINE_VALUES[0] !== 0 || INCLINE_VALUES.at(-1) !== 15 || INCLINE_VALUES[1] !== 0.5) {
  throw new Error(`Unexpected incline range: ${INCLINE_VALUES[0]}…${INCLINE_VALUES.at(-1)}`);
}
if (SPEED_VALUES[0] !== 1 || SPEED_VALUES.at(-1) !== 12 || SPEED_VALUES.length !== 111) {
  throw new Error(`Unexpected speed range (${SPEED_VALUES.length} values)`);
}
if (MINUTE_VALUES.at(-1) !== 180 || SECOND_VALUES.length !== 60) {
  throw new Error('Unexpected time wheels');
}

const bout = treadmillBout({ incline: 2.2, speed: 6.04, durationSec: 125 });
if (bout.kind !== 'treadmill' || bout.incline !== 2 || bout.speed !== 6 || bout.durationSec !== 125 || bout.done) {
  throw new Error(`Treadmill bout snapped wrong: ${JSON.stringify(bout)}`);
}
const label = formatBout(bout);
if (label !== '2.0% incline · 6.0 mph · 2:05') {
  throw new Error(`Unexpected bout label: ${label}`);
}
if (isTreadmillBlock({ log: 'strength', sets: [{ weight: 95, reps: 5, done: true }] })) {
  throw new Error('Strength sets should not look like treadmill bouts');
}
const lines = workoutTreadmillLines({
  exercises: [{ name: 'Treadmill', log: 'treadmill', sets: [bout] }],
});
if (lines.length !== 1 || !lines[0].includes('2:05')) {
  throw new Error(`History line missing treadmill bout: ${lines.join(' | ')}`);
}
const summary = workoutSummary({
  exercises: [
    { name: 'Bench', log: 'strength', sets: [{ weight: 95, reps: 5 }] },
    { name: 'Treadmill', log: 'treadmill', sets: [bout] },
  ],
});
if (!summary.startsWith('2 exercises · ') || !summary.includes('6.0 mph')) {
  throw new Error(`Workout summary dropped cardio: ${summary}`);
}

console.log(`OK: ${foodCount} foods, ${exCount} exercises across ${BODY_PARTS.length} body parts`);
