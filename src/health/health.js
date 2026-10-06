import { App } from '@capacitor/app';
import { Health } from '@capgo/capacitor-health';
import { todayISO } from '../utils.js';
import { isNativeIos } from '../native/platform.js';
import { averageHeartRate, healthWorkoutTitle, isIndoorWorkout, isMovementWorkout } from './model.js';

const ENABLED_KEY = 'pepstep:health-enabled';
const CACHE_KEY = 'pepstep:health-cache';
const READ_TYPES = ['steps', 'heartRate', 'calories', 'workouts'];
const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

const snapshot = {
  supported: false,
  enabled: false,
  status: 'off',
  error: '',
  stepsToday: null,
  workouts: [],
  fetchedAt: null,
};

let onChange = () => {};
let refreshToken = 0;
let started = false;

export function getHealthSnapshot() {
  return snapshot;
}

function notify() {
  onChange();
}

function readEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(ENABLED_KEY, '1');
    else localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* ignore */
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function applyCache() {
  const cache = readCache();
  snapshot.workouts = Array.isArray(cache?.workouts) ? cache.workouts : [];
  snapshot.stepsToday = cache?.stepsDay === todayISO() ? cache.stepsToday ?? null : null;
  snapshot.fetchedAt = cache?.fetchedAt || null;
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfToday() {
  const end = startOfToday();
  end.setDate(end.getDate() + 1);
  return end;
}

function normalizeWorkout(raw) {
  const startedAt = Date.parse(raw?.startDate);
  const finishedAt = Date.parse(raw?.endDate);
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return null;
  const draft = {
    id: String(raw.platformId || raw.sourceId || `${raw.workoutType || 'workout'}-${startedAt}`),
    workoutType: raw.workoutType,
    metadata: raw.metadata || {},
    startedAt,
    finishedAt,
    durationSec: Number(raw.duration) || Math.max(0, Math.round((finishedAt - startedAt) / 1000)),
    distanceMeters: raw.totalDistance == null ? null : Number(raw.totalDistance),
    calories: raw.totalEnergyBurned == null ? null : Math.round(Number(raw.totalEnergyBurned)),
    avgHeartRate: null,
    sourceName: raw.sourceName || 'Apple Health',
  };
  if (!isMovementWorkout(draft)) return null;
  draft.indoor = isIndoorWorkout(draft);
  draft.name = healthWorkoutTitle(draft);
  return draft;
}

async function queryMovementWorkouts(Health) {
  const startDate = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const endDate = new Date().toISOString();
  const responses = await Promise.all(
    ['walking', 'running'].map((workoutType) =>
      Health.queryWorkouts({
        workoutType,
        startDate,
        endDate,
        limit: 50,
        ascending: false,
      })
    )
  );
  const byId = new Map();
  for (const response of responses) {
    for (const raw of response?.workouts || []) {
      const workout = normalizeWorkout(raw);
      if (!workout || byId.has(workout.id)) continue;
      byId.set(workout.id, workout);
    }
  }
  return [...byId.values()].sort((a, b) => b.finishedAt - a.finishedAt);
}

async function attachHeartRates(Health, workouts) {
  const targets = workouts.slice(0, 20);
  const queue = targets.slice();
  async function worker() {
    while (queue.length) {
      const workout = queue.shift();
      try {
        const { samples } = await Health.readSamples({
          dataType: 'heartRate',
          startDate: new Date(workout.startedAt).toISOString(),
          endDate: new Date(workout.finishedAt).toISOString(),
          limit: 1000,
          ascending: true,
        });
        workout.avgHeartRate = averageHeartRate(samples);
      } catch {
        workout.avgHeartRate = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, targets.length) }, () => worker()));
  return workouts;
}

async function queryStepsToday(Health) {
  const { samples } = await Health.queryAggregated({
    dataType: 'steps',
    startDate: startOfToday().toISOString(),
    endDate: endOfToday().toISOString(),
    bucket: 'day',
    aggregation: 'sum',
  });
  const total = (samples || []).reduce((sum, sample) => sum + (Number(sample?.value) || 0), 0);
  return Math.max(0, Math.round(total));
}

function describeError(err, fallback) {
  const message = typeof err === 'string' ? err : err?.message;
  const text = message == null ? '' : String(message).trim();
  return text || fallback;
}

function failConnect(message) {
  snapshot.enabled = false;
  snapshot.status = 'error';
  snapshot.error = message;
  writeEnabled(false);
  notify();
}

export async function refreshHealth() {
  if (!isNativeIos() || !snapshot.enabled) return snapshot;
  const token = ++refreshToken;
  try {
    const [stepsToday, workouts] = await Promise.all([queryStepsToday(Health), queryMovementWorkouts(Health)]);
    await attachHeartRates(Health, workouts);
    if (token !== refreshToken || !snapshot.enabled) return snapshot;
    snapshot.stepsToday = stepsToday;
    snapshot.workouts = workouts;
    snapshot.fetchedAt = Date.now();
    snapshot.status = 'on';
    snapshot.error = '';
    writeCache({
      stepsDay: todayISO(),
      stepsToday,
      workouts,
      fetchedAt: snapshot.fetchedAt,
    });
    notify();
  } catch (err) {
    if (token !== refreshToken || !snapshot.enabled) return snapshot;
    snapshot.status = 'error';
    snapshot.error = describeError(err, 'Could not read Apple Health');
    notify();
  }
  return snapshot;
}

export async function connectHealth() {
  if (!isNativeIos()) throw new Error('Apple Health is only available in the iPhone app');
  snapshot.status = 'connecting';
  snapshot.error = '';
  notify();
  try {
    const availability = await Health.isAvailable();
    if (!availability?.available) {
      const reason = availability?.reason || 'Apple Health is not available on this iPhone';
      const message =
        availability?.platform === 'web'
          ? `The Health permission request never reached iOS, so PepStep will not appear in Settings → Health → Data Access & Devices. ${reason}`
          : reason;
      throw new Error(message);
    }
    await Health.requestAuthorization({
      read: READ_TYPES,
      write: [],
    });
    snapshot.enabled = true;
    snapshot.status = 'on';
    snapshot.error = '';
    writeEnabled(true);
    notify();
    await refreshHealth();
    return snapshot;
  } catch (err) {
    const message = describeError(err, 'Could not open Apple Health');
    failConnect(message);
    throw new Error(message);
  }
}

export function clearHealthDeviceCache() {
  snapshot.enabled = false;
  snapshot.status = 'off';
  snapshot.error = '';
  snapshot.stepsToday = null;
  snapshot.workouts = [];
  snapshot.fetchedAt = null;
  writeEnabled(false);
  clearCache();
  refreshToken += 1;
}

export async function disconnectHealth() {
  clearHealthDeviceCache();
  notify();
  return snapshot;
}

export function initHealth(hooks = {}) {
  onChange = hooks.onChange || (() => {});
  if (started) return;
  started = true;
  if (!isNativeIos()) return;
  snapshot.supported = true;
  snapshot.enabled = readEnabled();
  if (!snapshot.enabled) return;
  snapshot.status = 'on';
  applyCache();
  refreshHealth();
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && snapshot.enabled) refreshHealth();
  });
}
