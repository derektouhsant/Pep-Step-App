import { DEFAULT_GOALS } from '../storage.js';

const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snacks'];

export { DEFAULT_GOALS };

export function goalsFingerprint(goals = {}) {
  return [
    Number(goals.calories) || 0,
    Number(goals.carbs) || 0,
    Number(goals.protein) || 0,
    Number(goals.fat) || 0,
    Number(goals.waterCups) || 0,
  ].join('|');
}

export function isDefaultGoals(goals) {
  return goalsFingerprint(goals) === goalsFingerprint(DEFAULT_GOALS);
}

export function mergeById(localList = [], cloudList = [], idKey = 'id') {
  const map = new Map();
  for (const item of cloudList || []) {
    if (item && item[idKey] != null) map.set(String(item[idKey]), item);
  }
  for (const item of localList || []) {
    if (item && item[idKey] != null) map.set(String(item[idKey]), item);
  }
  return [...map.values()];
}

function mergeDay(localDay, cloudDay) {
  if (!localDay) return cloudDay;
  if (!cloudDay) return localDay;
  const meals = {};
  for (const id of MEAL_IDS) {
    meals[id] = mergeById(localDay.meals?.[id] || [], cloudDay.meals?.[id] || []);
  }
  return {
    meals,
    water: Math.max(Number(localDay.water) || 0, Number(cloudDay.water) || 0),
  };
}

export function mergeDiary(localDiary = {}, cloudDiary = {}) {
  const keys = new Set([...Object.keys(localDiary || {}), ...Object.keys(cloudDiary || {})]);
  const out = {};
  for (const key of keys) {
    out[key] = mergeDay(localDiary[key], cloudDiary[key]);
  }
  return out;
}

export function mergeGoals(localGoals, cloudGoals) {
  const local = { ...DEFAULT_GOALS, ...(localGoals || {}) };
  const cloud = { ...DEFAULT_GOALS, ...(cloudGoals || {}) };
  const out = { ...DEFAULT_GOALS };
  for (const key of Object.keys(DEFAULT_GOALS)) {
    const localChanged = local[key] !== DEFAULT_GOALS[key];
    const cloudChanged = cloud[key] !== DEFAULT_GOALS[key];
    if (localChanged) out[key] = local[key];
    else if (cloudChanged) out[key] = cloud[key];
  }
  return out;
}

export function mergeLastSets(localSets = {}, cloudSets = {}) {
  const keys = new Set([...Object.keys(cloudSets || {}), ...Object.keys(localSets || {})]);
  const out = {};
  for (const key of keys) {
    const a = localSets[key];
    const b = cloudSets[key];
    if (!a) {
      out[key] = b;
      continue;
    }
    if (!b) {
      out[key] = a;
      continue;
    }
    const aTime = Date.parse(a.date || '') || a.at || 0;
    const bTime = Date.parse(b.date || '') || b.at || 0;
    out[key] = aTime >= bTime ? a : b;
  }
  return out;
}

export function mergeActiveWorkout(localActive, cloudActive, history) {
  const histIds = new Set((history || []).map((w) => w.id));
  const local = localActive && localActive.id && !histIds.has(localActive.id) ? localActive : null;
  const cloud = cloudActive && cloudActive.id && !histIds.has(cloudActive.id) ? cloudActive : null;
  if (local && cloud && local.id === cloud.id) return local;
  if (!local) return cloud || null;
  if (!cloud) return local;
  return (local.startedAt || 0) >= (cloud.startedAt || 0) ? local : cloud;
}

export function mergeStates(local, cloud) {
  const left = local || {};
  const right = cloud || {};
  const customFoods = mergeById(left.customFoods, right.customFoods);
  const plans = mergeById(left.plans, right.plans);
  const workoutHistory = mergeById(left.workoutHistory, right.workoutHistory)
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 50);
  return {
    goals: mergeGoals(left.goals, right.goals),
    diary: mergeDiary(left.diary, right.diary),
    customFoods,
    workoutHistory,
    plans,
    lastSets: mergeLastSets(left.lastSets, right.lastSets),
    activeWorkout: mergeActiveWorkout(left.activeWorkout, right.activeWorkout, workoutHistory),
    meta: {
      ...(right.meta || {}),
      ...(left.meta || {}),
    },
  };
}
