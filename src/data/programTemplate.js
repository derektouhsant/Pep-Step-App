/**
 * PepStep 16-week plan template — PLACEHOLDER.
 *
 * This is the only file that decides plan content: split, days, exercises,
 * phases, sets, reps, and treadmill time. The rest of the app only reads
 * `PROGRAM_TEMPLATE` through `expandTemplate` in src/program.js.
 *
 * Replace this module when Derek's plan foundation is ready. Keep the export
 * name and the shape below, or update `expandTemplate` if the shape changes.
 *
 * Shape:
 * {
 *   id: string,
 *   name: string,
 *   daysPerWeek: number,
 *   split: string,
 *   days: [ // exactly 7. Index 0 is the calendar day the plan is built.
 *     { name: 'Rest', rest: true },
 *     { name: 'Upper A', exercises: [
 *       { id: 'barbell-bench-press' }, // strength uses the phase sets and reps
 *       { id: 'treadmill' },           // cardio uses phase cardioMinutes
 *     ]},
 *   ],
 *   phases: [ // cover weeks 1 through 16 with no gaps or overlaps
 *     { name: 'Foundation', weeks: [1, 4], sets: 3, reps: '10', cardioMinutes: 15 },
 *   ],
 *   // Optional. Used only when goals.daysPerWeek or goals.trainingDays matches a key.
 *   variants: {
 *     '3': { daysPerWeek: 3, split: 'full-body', days: [ ...7 days ] },
 *   },
 * }
 *
 * Exercise `id` values must exist in src/data/exercises.js.
 * Per-exercise `sets`, `reps`, or `minutes` override the phase for that movement.
 * Keep copy about movement. No medical, fat-loss, or medication framing.
 */

export const PROGRAM_TEMPLATE = {
  id: 'placeholder-upper-lower-v1',
  name: '4-month movement plan',
  daysPerWeek: 4,
  split: 'upper-lower',
  days: [
    {
      name: 'Upper A',
      exercises: [
        { id: 'barbell-bench-press' },
        { id: 'bent-over-barbell-row' },
        { id: 'barbell-overhead-press' },
        { id: 'dumbbell-curl' },
        { id: 'tricep-pushdown' },
      ],
    },
    {
      name: 'Lower A',
      exercises: [
        { id: 'back-squat' },
        { id: 'romanian-deadlift' },
        { id: 'barbell-hip-thrust' },
        { id: 'plank' },
      ],
    },
    { name: 'Rest', rest: true },
    {
      name: 'Upper B',
      exercises: [
        { id: 'incline-dumbbell-press' },
        { id: 'pull-up' },
        { id: 'lateral-raise' },
        { id: 'hammer-curl' },
        { id: 'skull-crusher' },
      ],
    },
    {
      name: 'Lower B',
      exercises: [
        { id: 'goblet-squat' },
        { id: 'walking-lunge' },
        { id: 'lying-leg-curl' },
        { id: 'glute-bridge' },
        { id: 'treadmill' },
      ],
    },
    { name: 'Rest', rest: true },
    { name: 'Rest', rest: true },
  ],
  phases: [
    { name: 'Foundation', weeks: [1, 4], sets: 3, reps: '10', cardioMinutes: 15 },
    { name: 'Build', weeks: [5, 8], sets: 3, reps: '8', cardioMinutes: 20 },
    { name: 'Strength', weeks: [9, 12], sets: 4, reps: '6', cardioMinutes: 20 },
    { name: 'Deload', weeks: [13, 13], sets: 2, reps: '8', cardioMinutes: 12 },
    { name: 'Strength', weeks: [14, 15], sets: 4, reps: '5', cardioMinutes: 20 },
    { name: 'Deload', weeks: [16, 16], sets: 2, reps: '10', cardioMinutes: 12 },
  ],
};
