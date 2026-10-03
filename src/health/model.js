const MOVEMENT_TYPES = new Set(['walking', 'running', 'runningTreadmill']);

export function isMovementWorkout(workout) {
  return MOVEMENT_TYPES.has(workout?.workoutType);
}

export function isIndoorWorkout(workout) {
  if (!workout) return false;
  if (workout.workoutType === 'runningTreadmill') return true;
  const meta = workout.metadata || {};
  for (const [key, value] of Object.entries(meta)) {
    const name = String(key).toLowerCase();
    if (!name.includes('indoor') && !name.includes('treadmill')) continue;
    const flag = String(value).toLowerCase();
    if (flag === '0' || flag === 'false' || flag === 'no') continue;
    return true;
  }
  return false;
}

export function healthWorkoutTitle(workout) {
  const indoor = isIndoorWorkout(workout);
  if (workout?.workoutType === 'runningTreadmill' || (workout?.workoutType === 'running' && indoor)) {
    return 'Treadmill run';
  }
  if (workout?.workoutType === 'walking' && indoor) return 'Indoor walk';
  if (workout?.workoutType === 'running') return 'Run';
  if (workout?.workoutType === 'walking') return 'Walk';
  return 'Workout';
}

export function overlapMs(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(Number(aStart) || 0, Number(bStart) || 0);
  const end = Math.min(Number(aEnd) || 0, Number(bEnd) || 0);
  return Math.max(0, end - start);
}

export function duplicatesManualSession(health, manual, now = Date.now()) {
  const h0 = Number(health?.startedAt);
  const h1 = Number(health?.finishedAt);
  const m0 = Number(manual?.startedAt);
  if (!h0 || !h1 || !m0 || h1 <= h0) return false;
  const m1 = Number(manual?.finishedAt) || now;
  if (m1 <= m0) return false;
  const overlap = overlapMs(h0, h1, m0, m1);
  if (overlap <= 0) return false;
  const shorter = Math.min(h1 - h0, m1 - m0);
  return overlap >= shorter * 0.5;
}

export function visibleHealthWorkouts(workouts, state, now = Date.now()) {
  const manual = [...(state?.workoutHistory || [])];
  if (state?.activeWorkout) manual.push(state.activeWorkout);
  return (workouts || []).filter((workout) => !manual.some((session) => duplicatesManualSession(workout, session, now)));
}

export function formatMiles(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n) || n <= 0) return '';
  const miles = n / 1609.344;
  if (miles < 0.1) return `${Math.round(n)} m`;
  const digits = miles >= 10 ? 1 : 2;
  return `${miles.toFixed(digits)} mi`;
}

export function averageHeartRate(samples) {
  const values = (samples || [])
    .map((sample) => Number(sample?.value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}
