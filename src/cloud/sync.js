import { defaultState } from '../storage.js';
import { getSupabase, isCloudConfigured } from './supabase.js';
import { mergeStates } from './merge.js';

const A2HS_KEY = 'pepstep:a2hs-dismissed';

const syncInfo = {
  configured: isCloudConfigured(),
  user: null,
  status: isCloudConfigured() ? 'offline' : 'unconfigured',
  lastSyncedAt: null,
  error: '',
  a2hsDismissed: false,
};

let hooks = {
  getState: () => defaultState(),
  setState: () => {},
  onChange: () => {},
};

let pushTimer = 0;
let pushChain = Promise.resolve();
let hydrateChain = Promise.resolve();
let started = false;

export function getSyncInfo() {
  return syncInfo;
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function loadA2hsDismissed() {
  try {
    syncInfo.a2hsDismissed = localStorage.getItem(A2HS_KEY) === '1';
  } catch {
    syncInfo.a2hsDismissed = false;
  }
  return syncInfo.a2hsDismissed;
}

export function dismissA2hs() {
  syncInfo.a2hsDismissed = true;
  try {
    localStorage.setItem(A2HS_KEY, '1');
  } catch {
    /* ignore */
  }
}

function paintSyncUi() {
  const label =
    !syncInfo.configured
      ? 'Not configured'
      : !syncInfo.user
        ? 'Offline on this device'
        : syncInfo.status === 'syncing' || syncInfo.status === 'pending'
          ? 'Syncing…'
          : syncInfo.status === 'error'
            ? 'Sync error'
            : syncInfo.status === 'synced'
              ? 'Synced'
              : 'Signed in';
  const tone =
    syncInfo.status === 'error' ? 'err' : syncInfo.status === 'synced' ? 'ok' : syncInfo.user ? 'pending' : 'off';
  for (const el of document.querySelectorAll('[data-sync-pill]')) {
    el.textContent = label;
    el.classList.remove('err', 'ok', 'pending', 'off');
    el.classList.add(tone);
  }
}

function setStatus(status, error = '') {
  syncInfo.status = status;
  syncInfo.error = error || '';
  paintSyncUi();
}

function toMillis(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

function toIso(ms) {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

function throwIfError(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

export async function cloudStateFromTables(supabase, userId) {
  const [profileRes, daysRes, foodsRes, sessionsRes, plansRes] = await Promise.all([
    supabase.from('profiles').select('goals,last_sets,updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('diary_days').select('day,water,meals').eq('user_id', userId),
    supabase.from('custom_foods').select('id,name,serving,calories,carbs,protein,fat').eq('user_id', userId),
    supabase.from('workout_sessions').select('id,name,plan_id,started_at,finished_at,exercises').eq('user_id', userId),
    supabase.from('workout_plans').select('id,name,source,exercises,created_at').eq('user_id', userId),
  ]);

  throwIfError(profileRes.error, 'Could not load profile');
  throwIfError(daysRes.error, 'Could not load diary');
  throwIfError(foodsRes.error, 'Could not load custom foods');
  throwIfError(sessionsRes.error, 'Could not load workouts');
  throwIfError(plansRes.error, 'Could not load plans');

  const diary = {};
  for (const row of daysRes.data || []) {
    const key = String(row.day).slice(0, 10);
    diary[key] = {
      water: Number(row.water) || 0,
      meals: row.meals || {},
    };
  }

  const sessions = sessionsRes.data || [];
  const workoutHistory = sessions
    .filter((row) => row.finished_at)
    .map((row) => ({
      id: row.id,
      name: row.name,
      planId: row.plan_id || undefined,
      startedAt: toMillis(row.started_at),
      finishedAt: toMillis(row.finished_at),
      exercises: row.exercises || [],
    }))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 50);

  const activeRow = sessions
    .filter((row) => !row.finished_at)
    .sort((a, b) => toMillis(b.started_at) - toMillis(a.started_at))[0];

  const cloud = defaultState();
  cloud.goals = { ...cloud.goals, ...(profileRes.data?.goals || {}) };
  cloud.lastSets = profileRes.data?.last_sets || {};
  cloud.diary = diary;
  cloud.customFoods = (foodsRes.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    serving: row.serving,
    calories: Number(row.calories) || 0,
    carbs: Number(row.carbs) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    custom: true,
  }));
  cloud.workoutHistory = workoutHistory;
  cloud.activeWorkout = activeRow
    ? {
        id: activeRow.id,
        name: activeRow.name,
        planId: activeRow.plan_id || undefined,
        startedAt: toMillis(activeRow.started_at),
        exercises: activeRow.exercises || [],
      }
    : null;
  cloud.plans = (plansRes.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source || 'diy',
    exercises: row.exercises || [],
    createdAt: toMillis(row.created_at) || Date.now(),
  }));
  return cloud;
}

async function deleteMissing(supabase, table, userId, localIds) {
  const { data, error } = await supabase.from(table).select('id').eq('user_id', userId);
  throwIfError(error, `Could not list ${table}`);
  const extra = (data || []).map((row) => row.id).filter((id) => !localIds.has(id));
  if (!extra.length) return;
  const { error: delError } = await supabase.from(table).delete().eq('user_id', userId).in('id', extra);
  throwIfError(delError, `Could not prune ${table}`);
}

export async function pushStateToCloud(supabase, userId, state) {
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from('profiles').upsert({
    user_id: userId,
    goals: state.goals || {},
    last_sets: state.lastSets || {},
    updated_at: now,
  });
  throwIfError(profileError, 'Could not save goals');

  const days = Object.entries(state.diary || {}).map(([day, data]) => ({
    user_id: userId,
    day,
    water: Number(data?.water) || 0,
    meals: data?.meals || {},
    updated_at: now,
  }));
  if (days.length) {
    const { error } = await supabase.from('diary_days').upsert(days, { onConflict: 'user_id,day' });
    throwIfError(error, 'Could not save diary');
  }

  const foods = (state.customFoods || []).map((food) => ({
    id: food.id,
    user_id: userId,
    name: food.name,
    serving: food.serving || '1 serving',
    calories: Number(food.calories) || 0,
    carbs: Number(food.carbs) || 0,
    protein: Number(food.protein) || 0,
    fat: Number(food.fat) || 0,
    updated_at: now,
  }));
  if (foods.length) {
    const { error } = await supabase.from('custom_foods').upsert(foods, { onConflict: 'user_id,id' });
    throwIfError(error, 'Could not save custom foods');
  }
  await deleteMissing(supabase, 'custom_foods', userId, new Set((state.customFoods || []).map((f) => f.id)));

  const historyRows = (state.workoutHistory || []).map((w) => ({
    id: w.id,
    user_id: userId,
    name: w.name || 'Workout',
    plan_id: w.planId || null,
    started_at: toIso(w.startedAt),
    finished_at: toIso(w.finishedAt),
    exercises: w.exercises || [],
    updated_at: now,
  }));
  const active = state.activeWorkout;
  const sessionRows = [...historyRows];
  if (active?.id && !historyRows.some((row) => row.id === active.id)) {
    sessionRows.push({
      id: active.id,
      user_id: userId,
      name: active.name || 'Workout',
      plan_id: active.planId || null,
      started_at: toIso(active.startedAt),
      finished_at: null,
      exercises: active.exercises || [],
      updated_at: now,
    });
  }
  if (sessionRows.length) {
    const { error } = await supabase.from('workout_sessions').upsert(sessionRows, { onConflict: 'user_id,id' });
    throwIfError(error, 'Could not save workouts');
  }
  await deleteMissing(
    supabase,
    'workout_sessions',
    userId,
    new Set(sessionRows.map((row) => row.id))
  );

  const plans = (state.plans || []).map((plan) => ({
    id: plan.id,
    user_id: userId,
    name: plan.name || 'Plan',
    source: plan.source || 'diy',
    exercises: plan.exercises || [],
    created_at: toIso(plan.createdAt) || now,
    updated_at: now,
  }));
  if (plans.length) {
    const { error } = await supabase.from('workout_plans').upsert(plans, { onConflict: 'user_id,id' });
    throwIfError(error, 'Could not save plans');
  }
  await deleteMissing(supabase, 'workout_plans', userId, new Set((state.plans || []).map((p) => p.id)));
}

export async function clearCloudData() {
  const supabase = getSupabase();
  const userId = syncInfo.user?.id;
  if (!supabase || !userId) return;
  const tables = ['diary_days', 'custom_foods', 'workout_sessions', 'workout_plans', 'profiles'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    throwIfError(error, `Could not clear ${table}`);
  }
}

function hydrateFromCloud() {
  hydrateChain = hydrateChain.then(runHydrate, runHydrate);
  return hydrateChain;
}

async function runHydrate() {
  const supabase = getSupabase();
  const user = syncInfo.user;
  if (!supabase || !user) return;

  setStatus('syncing');
  try {
    const cloud = await cloudStateFromTables(supabase, user.id);
    const local = hooks.getState();
    const localOwner = local.meta?.userId || null;
    let next;
    if (localOwner && localOwner !== user.id) {
      next = cloud;
    } else {
      next = mergeStates(local, cloud);
    }
    next.meta = { ...(next.meta || {}), userId: user.id, savedAt: Date.now() };
    hooks.setState(next, { sync: false });
    await pushStateToCloud(supabase, user.id, next);
    syncInfo.lastSyncedAt = Date.now();
    setStatus('synced');
    hooks.onChange();
  } catch (err) {
    setStatus('error', err.message || 'Sync failed');
    hooks.onChange();
  }
}

async function flushPush() {
  const supabase = getSupabase();
  const user = syncInfo.user;
  if (!supabase || !user) return;
  const snapshot = hooks.getState();
  snapshot.meta = { ...(snapshot.meta || {}), userId: user.id };
  setStatus('syncing');
  try {
    await pushStateToCloud(supabase, user.id, snapshot);
    syncInfo.lastSyncedAt = Date.now();
    setStatus('synced');
  } catch (err) {
    setStatus('error', err.message || 'Sync failed');
  }
}

export function schedulePush() {
  if (!syncInfo.user) return;
  if (syncInfo.status !== 'syncing') setStatus('pending');
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushChain = pushChain.then(flushPush, flushPush);
  }, 700);
}

export async function syncNow() {
  if (!syncInfo.user) return;
  clearTimeout(pushTimer);
  await hydrateFromCloud();
}

export async function sendMagicLink(email) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cloud sync is not configured');
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) throw new Error('Enter a valid email');
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function applySession(session) {
  syncInfo.user = session?.user || null;
  if (!syncInfo.configured) {
    syncInfo.status = 'unconfigured';
    return;
  }
  if (!syncInfo.user) {
    syncInfo.status = 'offline';
    syncInfo.error = '';
  }
}

export async function initCloud(options) {
  hooks = { ...hooks, ...options };
  loadA2hsDismissed();
  if (started) return;
  started = true;

  const supabase = getSupabase();
  if (!supabase) {
    syncInfo.status = 'unconfigured';
    hooks.onChange();
    return;
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    applySession(session);
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (session?.user) await hydrateFromCloud();
      else hooks.onChange();
      return;
    }
    if (event === 'SIGNED_OUT') {
      applySession(null);
      hooks.onChange();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !syncInfo.user) return;
    const active = document.activeElement;
    if (active && /^(input|textarea|select)$/i.test(active.tagName)) return;
    hydrateFromCloud();
  });
}
