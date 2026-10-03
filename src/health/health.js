import { isIosApp } from '../platform.js';

const CONNECTED_KEY = 'pepstep:health-connected';

/** Read-only. PepStep never requests write access and never calls saveSample. */
const READ_TYPES = ['steps', 'workouts', 'heartRate', 'calories'];

const WORKOUT_LABELS = {
  running: 'Running',
  runningTreadmill: 'Treadmill',
  walking: 'Walking',
  wheelchairWalkPace: 'Walking',
  wheelchairRunPace: 'Running',
  traditionalStrengthTraining: 'Strength',
  functionalStrengthTraining: 'Strength',
  strengthTraining: 'Strength',
  highIntensityIntervalTraining: 'HIIT',
  cycling: 'Cycling',
  bikingStationary: 'Cycling',
  elliptical: 'Elliptical',
  rowing: 'Rowing',
  rowingMachine: 'Rowing',
  hiking: 'Hiking',
  yoga: 'Yoga',
  swimming: 'Swimming',
  swimmingPool: 'Swimming',
  swimmingOpenWater: 'Open water swim',
  stairClimbing: 'Stair climbing',
  stairClimbingMachine: 'Stair climber',
  mixedCardio: 'Mixed cardio',
  coreTraining: 'Core',
  cooldown: 'Cooldown',
  flexibility: 'Flexibility',
  other: 'Workout',
};

const healthInfo = {
  supported: false,
  status: 'unsupported',
  stepsToday: null,
  activeEnergyToday: null,
  heartRateToday: null,
  workouts: [],
  error: '',
};

export function getHealthInfo() {
  return healthInfo;
}

function connectedFlag() {
  try {
    return localStorage.getItem(CONNECTED_KEY) === '1';
  } catch {
    return false;
  }
}

function setConnectedFlag(on) {
  try {
    if (on) localStorage.setItem(CONNECTED_KEY, '1');
    else localStorage.removeItem(CONNECTED_KEY);
  } catch {
    /* ignore */
  }
}

function workoutLabel(type) {
  if (WORKOUT_LABELS[type]) return WORKOUT_LABELS[type];
  if (!type) return 'Workout';
  const spaced = String(type)
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function sampleNumber(row) {
  if (!row) return 0;
  if (Number.isFinite(Number(row.value))) return Number(row.value);
  if (Number.isFinite(Number(row.values?.sum))) return Number(row.values.sum);
  return 0;
}

function sumSamples(result) {
  if (!result) return null;
  const rows = result.samples || [];
  if (!rows.length) return 0;
  return Math.round(rows.reduce((total, row) => total + sampleNumber(row), 0));
}

function average(values) {
  const nums = (values || []).filter((value) => Number.isFinite(value));
  if (!nums.length) return null;
  return Math.round(nums.reduce((total, value) => total + value, 0) / nums.length);
}

function normalizeWorkout(workout, heartSamples) {
  const start = Date.parse(workout.startDate);
  const end = Date.parse(workout.endDate);
  const inWindow = (heartSamples || []).filter((sample) => {
    const at = Date.parse(sample.startDate || sample.endDate);
    return Number.isFinite(at) && Number.isFinite(start) && Number.isFinite(end) && at >= start && at <= end;
  });
  return {
    id: workout.platformId || `${workout.workoutType || 'workout'}-${workout.startDate}`,
    workoutType: workout.workoutType || 'other',
    name: workoutLabel(workout.workoutType),
    start: Number.isFinite(start) ? start : Date.now(),
    end: Number.isFinite(end) ? end : Date.now(),
    durationSec: Number(workout.duration) || 0,
    energy: Number.isFinite(Number(workout.totalEnergyBurned)) ? Math.round(Number(workout.totalEnergyBurned)) : null,
    distanceMeters: Number.isFinite(Number(workout.totalDistance)) ? Number(workout.totalDistance) : null,
    sourceName: workout.sourceName || 'Apple Health',
    heartRate: average(inWindow.map((sample) => Number(sample.value))),
    from: 'apple-health',
  };
}

function overlapsManual(workout, state) {
  const manuals = [...(state?.workoutHistory || [])];
  if (state?.activeWorkout?.startedAt) manuals.push(state.activeWorkout);
  return manuals.some((manual) => {
    const manualStart = manual.startedAt;
    if (!manualStart) return false;
    const manualEnd = manual.finishedAt || manualStart + 60 * 60 * 1000;
    const overlap = Math.min(workout.end, manualEnd) - Math.max(workout.start, manualStart);
    if (overlap <= 0) return false;
    const shorter = Math.min(workout.end - workout.start, manualEnd - manualStart);
    return shorter > 0 && overlap >= shorter * 0.5;
  });
}

/** Apple Health sessions that are not the same bout as a workout logged in PepStep. */
export function visibleHealthWorkouts(state) {
  return (healthInfo.workouts || []).filter((workout) => !overlapsManual(workout, state));
}

async function healthPlugin() {
  const { Health } = await import('@capgo/capacitor-health');
  return Health;
}

export async function refreshHealth() {
  if (!isIosApp()) return;
  const Health = await healthPlugin();
  healthInfo.supported = true;
  healthInfo.error = '';
  try {
  const todayStart = startOfToday().toISOString();
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [stepsRes, energyRes, heartRes, workoutRes] = await Promise.all([
    Health.queryAggregated({
      dataType: 'steps',
      startDate: todayStart,
      endDate: now,
      bucket: 'day',
      aggregation: 'sum',
    }).catch(() => Health.readSamples({ dataType: 'steps', startDate: todayStart, endDate: now, limit: 1000 })),
    Health.queryAggregated({
      dataType: 'calories',
      startDate: todayStart,
      endDate: now,
      bucket: 'day',
      aggregation: 'sum',
    }).catch(() => null),
    Health.readSamples({ dataType: 'heartRate', startDate: weekAgo, endDate: now, limit: 800 }).catch(() => ({ samples: [] })),
    Health.queryWorkouts({ startDate: monthAgo, endDate: now, limit: 40 }),
  ]);

  const heartSamples = heartRes?.samples || [];
  const todayHeart = heartSamples.filter((sample) => Date.parse(sample.startDate || sample.endDate) >= startOfToday().getTime());
  healthInfo.stepsToday = sumSamples(stepsRes);
  healthInfo.activeEnergyToday = sumSamples(energyRes);
  healthInfo.heartRateToday = average(todayHeart.map((sample) => Number(sample.value)));
  healthInfo.workouts = (workoutRes?.workouts || []).map((workout) => normalizeWorkout(workout, heartSamples));
  healthInfo.status = 'ready';
  } catch (err) {
    if (healthInfo.status !== 'ready') {
      healthInfo.status = 'error';
      healthInfo.error = err?.message || 'Could not read Apple Health';
    }
    throw err;
  }
}

export async function connectHealth() {
  if (!isIosApp()) throw new Error('Apple Health is available in the iPhone app');
  healthInfo.status = 'loading';
  const Health = await healthPlugin();
  const availability = await Health.isAvailable();
  if (!availability?.available) {
    const reason = availability?.reason || 'Apple Health is not available on this iPhone';
    healthInfo.status = 'error';
    healthInfo.error = reason;
    throw new Error(reason);
  }
  await Health.requestAuthorization({ read: READ_TYPES });
  setConnectedFlag(true);
  try {
    await refreshHealth();
  } catch (err) {
    healthInfo.status = 'error';
    healthInfo.error = err?.message || 'Could not read Apple Health';
    throw err;
  }
}

export function initHealth(onChange) {
  healthInfo.supported = isIosApp();
  if (!healthInfo.supported) {
    healthInfo.status = 'unsupported';
    return;
  }
  if (!connectedFlag()) {
    healthInfo.status = 'off';
    return;
  }
  healthInfo.status = 'loading';
  refreshHealth()
    .then(() => onChange?.())
    .catch((err) => {
      healthInfo.status = 'error';
      healthInfo.error = err?.message || 'Could not read Apple Health';
      onChange?.();
    });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!connectedFlag() || !healthInfo.supported) return;
    refreshHealth()
      .then(() => onChange?.())
      .catch(() => {
        /* Keep the last successful reading on screen. */
      });
  });
}
