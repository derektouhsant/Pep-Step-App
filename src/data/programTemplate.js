/**
 * Vanessa's Women's Workout — 16 weeks.
 *
 * The app reads this file through expandTemplate in src/program.js.
 * `cycle` repeats in order and is not tied to a weekday.
 * `weekPlan` is the week-by-week dose: reps, then sets, then harder
 * variations. Weeks 4, 8, 12, and 16 are lighter recovery weeks.
 *
 * Exercise ids must exist in src/data/exercises.js.
 * `name` overrides the library label shown on the plan.
 * `hold: true` uses holdSec instead of reps.
 * `harder` swaps in another library exercise from that week onward,
 * except on recovery weeks.
 * Treadmill `style` is incline, easy, or intervals. Time, incline, and
 * speed come from the week row and use the existing treadmill logger.
 *
 * Framing stays on movement. No fat-loss or medication copy.
 */

const harderBridge = { id: 'single-leg-glute-bridge', fromWeek: 13, reps: 8 };
const harderPushUp = { id: 'push-up', fromWeek: 13, reps: 8 };
const harderBurpee = { id: 'burpee', fromWeek: 13, reps: 5 };

export const PROGRAM_TEMPLATE = {
  id: 'vanessas-womens-workout-v1',
  name: "Vanessa's Women's Workout",
  level: 'Beginner',
  split: '3 days on, 1 rest',
  cycle: [
    {
      name: 'Lower body',
      exercises: [
        { id: 'bodyweight-squat' },
        { id: 'glute-bridge', harder: harderBridge },
        { id: 'reverse-lunge' },
        { id: 'wall-sit', hold: true },
        { id: 'bodyweight-calf-raise' },
        { id: 'treadmill', name: 'Incline treadmill walk', style: 'incline' },
      ],
    },
    {
      name: 'Upper body & core',
      exercises: [
        { id: 'incline-push-up', harder: harderPushUp },
        { id: 'plank', hold: true },
        { id: 'bird-dog' },
        { id: 'bench-dip', name: 'Chair Tricep Dip' },
        { id: 'dead-bug' },
        { id: 'treadmill', name: 'Easy treadmill walk', style: 'easy' },
      ],
    },
    {
      name: 'Full body',
      exercises: [
        { id: 'step-up' },
        { id: 'squat-to-reach' },
        { id: 'modified-burpee', harder: harderBurpee },
        { id: 'side-plank', hold: true },
        { id: 'superman-hold', hold: true },
        { id: 'treadmill', name: 'Treadmill intervals', style: 'intervals' },
      ],
    },
    { name: 'Rest', rest: true },
  ],
  weekPlan: [
    { week: 1, phase: 'Getting started', sets: 2, reps: 8, holdSec: 15, cardioMinutes: 25, incline: 3, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3.2 },
    { week: 2, phase: 'Getting started', sets: 2, reps: 10, holdSec: 20, cardioMinutes: 28, incline: 3, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3.2 },
    { week: 3, phase: 'Getting started', sets: 2, reps: 12, holdSec: 25, cardioMinutes: 32, incline: 3.5, walkSpeed: 2.6, easySpeed: 2.6, briskSpeed: 3.3 },
    { week: 4, phase: 'Ease back', recovery: true, sets: 2, reps: 8, holdSec: 15, cardioMinutes: 25, incline: 2, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3 },
    { week: 5, phase: 'Build', sets: 2, reps: 10, holdSec: 25, cardioMinutes: 34, incline: 4, walkSpeed: 2.7, easySpeed: 2.7, briskSpeed: 3.3 },
    { week: 6, phase: 'Build', sets: 2, reps: 12, holdSec: 30, cardioMinutes: 37, incline: 4, walkSpeed: 2.7, easySpeed: 2.7, briskSpeed: 3.4 },
    { week: 7, phase: 'Build', sets: 2, reps: 15, holdSec: 35, cardioMinutes: 40, incline: 4, walkSpeed: 2.8, easySpeed: 2.8, briskSpeed: 3.4 },
    { week: 8, phase: 'Ease back', recovery: true, sets: 2, reps: 8, holdSec: 20, cardioMinutes: 25, incline: 2, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3 },
    { week: 9, phase: 'Add a set', sets: 3, reps: 12, holdSec: 30, cardioMinutes: 42, incline: 4.5, walkSpeed: 2.8, easySpeed: 2.8, briskSpeed: 3.5 },
    { week: 10, phase: 'Add a set', sets: 3, reps: 12, holdSec: 35, cardioMinutes: 44, incline: 5, walkSpeed: 2.8, easySpeed: 2.9, briskSpeed: 3.5 },
    { week: 11, phase: 'Add a set', sets: 3, reps: 15, holdSec: 40, cardioMinutes: 45, incline: 5, walkSpeed: 3, easySpeed: 3, briskSpeed: 3.6 },
    { week: 12, phase: 'Ease back', recovery: true, sets: 2, reps: 8, holdSec: 20, cardioMinutes: 25, incline: 2, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3 },
    { week: 13, phase: 'Stronger', sets: 3, reps: 12, holdSec: 40, cardioMinutes: 45, incline: 5, walkSpeed: 3, easySpeed: 3, briskSpeed: 3.6 },
    { week: 14, phase: 'Stronger', sets: 3, reps: 15, holdSec: 45, cardioMinutes: 45, incline: 5, walkSpeed: 3, easySpeed: 3, briskSpeed: 3.6 },
    { week: 15, phase: 'Stronger', sets: 3, reps: 15, holdSec: 45, cardioMinutes: 45, incline: 5, walkSpeed: 3, easySpeed: 3, briskSpeed: 3.6 },
    { week: 16, phase: 'Ease back', recovery: true, sets: 2, reps: 8, holdSec: 20, cardioMinutes: 25, incline: 2, walkSpeed: 2.5, easySpeed: 2.5, briskSpeed: 3 },
  ],
};
