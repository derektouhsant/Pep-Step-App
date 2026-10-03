import {
  averageHeartRate,
  duplicatesManualSession,
  formatMiles,
  healthWorkoutTitle,
  isIndoorWorkout,
  isMovementWorkout,
  visibleHealthWorkouts,
} from '../src/health/model.js';
import { defaultState } from '../src/storage.js';
import { renderHome } from '../src/views/home.js';
import { renderMore } from '../src/views/more.js';
import { renderWorkouts } from '../src/views/workouts.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const outdoorRun = {
  id: 'hk-run',
  workoutType: 'running',
  metadata: { HKIndoorWorkout: '0' },
  startedAt: Date.parse('2026-10-03T14:00:00'),
  finishedAt: Date.parse('2026-10-03T14:40:00'),
};

const treadmill = {
  id: 'hk-tread',
  workoutType: 'running',
  metadata: { HKIndoorWorkout: '1' },
  startedAt: Date.parse('2026-10-03T15:00:00'),
  finishedAt: Date.parse('2026-10-03T15:30:00'),
};

const walk = {
  id: 'hk-walk',
  workoutType: 'walking',
  metadata: {},
  startedAt: Date.parse('2026-10-02T12:00:00'),
  finishedAt: Date.parse('2026-10-02T12:25:00'),
};

assert(isMovementWorkout(outdoorRun), 'running is a movement workout');
assert(!isMovementWorkout({ workoutType: 'cycling' }), 'cycling is not imported');
assert(isIndoorWorkout(treadmill), 'indoor flag marks treadmill');
assert(!isIndoorWorkout(outdoorRun), 'outdoor run is not indoor');
assert(healthWorkoutTitle(treadmill) === 'Treadmill run', 'indoor run title');
assert(healthWorkoutTitle({ workoutType: 'runningTreadmill' }) === 'Treadmill run', 'treadmill type title');
assert(healthWorkoutTitle({ workoutType: 'walking', metadata: { HKIndoorWorkout: '1' } }) === 'Indoor walk', 'indoor walk title');
assert(healthWorkoutTitle(outdoorRun) === 'Run', 'outdoor run title');
assert(healthWorkoutTitle(walk) === 'Walk', 'walk title');

const manual = {
  id: 'local-1',
  name: 'Workout',
  startedAt: Date.parse('2026-10-03T15:02:00'),
  finishedAt: Date.parse('2026-10-03T15:28:00'),
  exercises: [{ log: 'treadmill' }],
};

assert(duplicatesManualSession(treadmill, manual), 'overlapping treadmill is a duplicate');
assert(!duplicatesManualSession(outdoorRun, manual), 'separate run is not a duplicate');

const edge = {
  id: 'hk-edge',
  workoutType: 'running',
  startedAt: manual.finishedAt - 2 * 60 * 1000,
  finishedAt: manual.finishedAt + 28 * 60 * 1000,
};
assert(!duplicatesManualSession(edge, manual), 'a brief overlap stays visible');
const contained = {
  id: 'hk-in',
  workoutType: 'running',
  startedAt: manual.startedAt + 60 * 1000,
  finishedAt: manual.startedAt + 3 * 60 * 1000,
};
assert(duplicatesManualSession(contained, manual), 'a workout fully inside a logged session is hidden');

const state = {
  workoutHistory: [manual],
  activeWorkout: null,
};
const before = state.workoutHistory.slice();
const visible = visibleHealthWorkouts([outdoorRun, treadmill, walk], state);
assert(visible.map((item) => item.id).join() === 'hk-run,hk-walk', 'hides only the overlapping import');
assert(state.workoutHistory[0] === before[0], 'manual history is not replaced');
assert(formatMiles(1609.344) === '1.00 mi', 'one mile');
assert(formatMiles(0) === '', 'no distance');
assert(averageHeartRate([{ value: 140 }, { value: 150 }, { value: 0 }]) === 145, 'average heart rate');

const emptyState = defaultState();
const webHome = renderHome(emptyState);
assert(!webHome.includes('Apple Health'), 'web home hides Apple Health');
const webMore = renderMore(emptyState, { authEmail: '' }, { configured: false, status: 'unconfigured', user: null });
assert(webMore.includes('Add to Home Screen'), 'web more keeps the install tip');
assert(!webMore.includes('Apple Health'), 'web more hides Apple Health');
const webWorkouts = renderWorkouts(emptyState, { workoutView: 'home' }, []);
assert(!webWorkouts.includes('Apple Health'), 'web workout history hides Apple Health');

const startedAt = Date.now() - 30 * 60 * 1000;
const finishedAt = Date.now() - 60 * 1000;
const health = {
  supported: true,
  enabled: true,
  status: 'on',
  fetchedAt: Date.now(),
  stepsToday: 4321,
  workouts: [
    {
      id: 'h1',
      name: 'Treadmill run',
      workoutType: 'running',
      startedAt,
      finishedAt,
      durationSec: 1800,
      distanceMeters: 3200,
      calories: 240,
      avgHeartRate: 142,
    },
  ],
};
const iosHome = renderHome(emptyState, { health });
assert(iosHome.includes('Apple Health'), 'home shows the Apple Health label');
assert(iosHome.includes('4,321') || iosHome.includes('4321'), 'home shows today steps');
assert(iosHome.includes('Treadmill run'), 'home shows the imported workout');
assert(iosHome.includes('142 bpm avg'), 'home shows average heart rate');
assert(iosHome.includes('240 cal'), 'home shows calories');

const manualState = {
  ...emptyState,
  workoutHistory: [
    {
      id: 'm1',
      name: 'Leg day',
      startedAt,
      finishedAt,
      exercises: [{ name: 'Treadmill', log: 'treadmill', sets: [] }],
    },
  ],
};
const dedupedHome = renderHome(manualState, { health });
assert(!dedupedHome.includes('Treadmill run'), 'home hides an import that overlaps a logged session');
assert(dedupedHome.includes('Leg day'), 'logged session stays on Home');
const dedupedWorkouts = renderWorkouts(manualState, { workoutView: 'home' }, [], { health });
assert(dedupedWorkouts.includes('Leg day'), 'logged workout stays in history');
assert(!dedupedWorkouts.includes('Treadmill run'), 'overlapping import is not added to history');
const openWorkouts = renderWorkouts(emptyState, { workoutView: 'home' }, [], { health });
assert(openWorkouts.includes('Treadmill run'), 'import shows when nothing overlaps it');
assert(openWorkouts.includes('Apple Health'), 'history badge is present');

const iosMore = renderMore(emptyState, { authEmail: '' }, { configured: false, status: 'unconfigured', user: null }, {
  native: true,
  health,
});
assert(iosMore.includes('role="switch"'), 'more has a connect switch');
assert(iosMore.includes('aria-checked="true"'), 'switch shows connected');
assert(!iosMore.includes('Add to Home Screen'), 'native more hides the Safari install tip');
const offMore = renderMore(emptyState, { authEmail: '' }, { configured: false, status: 'unconfigured', user: null }, {
  native: true,
  health: { ...health, enabled: false, status: 'off' },
});
assert(offMore.includes('aria-checked="false"'), 'switch can turn off');

console.log('health checks ok');
