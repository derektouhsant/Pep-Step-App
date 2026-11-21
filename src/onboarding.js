import { DEFAULT_GOALS } from './storage.js';

export const COMFORT_NOTE =
  'This is about exercise comfort only. Not medical advice; check with your doctor before starting a new program.';

export const ONBOARDING_FLOW = [
  { id: 'welcome' },
  {
    id: 'goal',
    field: 'goal',
    title: 'What do you most want from movement?',
    options: [
      { id: 'move', label: 'Move more every day', hint: 'A little movement, most days' },
      { id: 'strength', label: 'Build strength', hint: 'Feel stronger in daily life' },
      { id: 'energy', label: 'More energy and stamina', hint: 'Last longer through the day' },
      { id: 'age', label: 'Stay active as I age', hint: 'Keep moving for the long run' },
    ],
  },
  {
    id: 'experience',
    field: 'experience',
    title: 'Where are you starting from?',
    options: [
      { id: 'starting', label: 'Just starting', hint: 'New to regular movement' },
      { id: 'some', label: 'Some experience', hint: 'I have trained a bit' },
      { id: 'regular', label: 'Regularly active', hint: 'Movement is already a habit' },
    ],
  },
  {
    id: 'days',
    field: 'daysPerWeek',
    title: 'How many days a week feels realistic?',
    options: [
      { id: '2', label: '2' },
      { id: '3', label: '3' },
      { id: '4', label: '4' },
      { id: '5', label: '5+' },
    ],
  },
  {
    id: 'comfort',
    field: 'comfort',
    multi: true,
    optional: true,
    title: 'Anything to work around?',
    note: COMFORT_NOTE,
    options: [
      { id: 'knees', label: 'Knees' },
      { id: 'back', label: 'Back' },
      { id: 'shoulders', label: 'Shoulders' },
      { id: 'none', label: 'None of these' },
    ],
  },
  { id: 'save' },
];

const GOAL_IDS = new Set(['move', 'strength', 'energy', 'age']);
const EXPERIENCE_IDS = new Set(['starting', 'some', 'regular']);
const DAY_IDS = new Set([2, 3, 4, 5]);
const COMFORT_IDS = new Set(['knees', 'back', 'shoulders', 'none']);

export function emptyAnswers() {
  return { goal: '', experience: '', daysPerWeek: null, comfort: [] };
}

export function normalizeAnswers(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const goal = GOAL_IDS.has(source.goal) ? source.goal : '';
  const experience = EXPERIENCE_IDS.has(source.experience) ? source.experience : '';
  const days = Number(source.daysPerWeek);
  const daysPerWeek = DAY_IDS.has(days) ? days : null;
  const picked = Array.isArray(source.comfort) ? source.comfort.filter((id) => COMFORT_IDS.has(id)) : [];
  const comfort = picked.includes('none') ? ['none'] : [...new Set(picked)];
  return { goal, experience, daysPerWeek, comfort };
}

export function cloneAnswers(raw) {
  const answers = normalizeAnswers(raw);
  return { ...answers, comfort: [...answers.comfort] };
}

export function normalizeOnboarding(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.status !== 'completed' && raw.status !== 'skipped') return null;
  return {
    status: raw.status,
    answers: normalizeAnswers(raw.answers),
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

export function isOnboardingSettled(raw) {
  const onboarding = normalizeOnboarding(raw);
  return Boolean(onboarding);
}

export function buildOnboarding(status, draft, now = Date.now()) {
  return {
    status: status === 'skipped' ? 'skipped' : 'completed',
    answers: normalizeAnswers(draft),
    updatedAt: now,
  };
}

export function toggleComfort(current, id) {
  if (!COMFORT_IDS.has(id)) return normalizeAnswers({ comfort: current }).comfort;
  const set = new Set(normalizeAnswers({ comfort: current }).comfort);
  if (id === 'none') return set.has('none') ? [] : ['none'];
  set.delete('none');
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

function goalsUntouched(goals) {
  if (!goals || typeof goals !== 'object') return true;
  return Object.keys(DEFAULT_GOALS).every((key) => goals[key] == null || goals[key] === DEFAULT_GOALS[key]);
}

function diaryHasActivity(diary) {
  for (const day of Object.values(diary || {})) {
    if (!day || typeof day !== 'object') continue;
    if (Number(day.water) > 0) return true;
    for (const items of Object.values(day.meals || {})) {
      if (Array.isArray(items) && items.length > 0) return true;
    }
  }
  return false;
}

/**
 * Existing installs already have a saved PepStep store or real logs.
 * Those people stay on Home. A brand-new empty store is the only case
 * that should see first-launch questions.
 */
export function hasPriorActivity(state) {
  if (!state || typeof state !== 'object') return false;
  if (diaryHasActivity(state.diary)) return true;
  if ((state.customFoods || []).length > 0) return true;
  if ((state.workoutHistory || []).length > 0) return true;
  if ((state.plans || []).length > 0) return true;
  if (state.activeWorkout) return true;
  if (state.lastSets && Object.keys(state.lastSets).length > 0) return true;
  if (state.meta?.userId) return true;
  if (Number(state.meta?.savedAt) > 0) return true;
  if (!goalsUntouched(state.goals)) return true;
  return false;
}

export function shouldOfferOnboarding(state, { signedIn = false, authReady = true } = {}) {
  return onboardingGate(state, { signedIn, authReady }) === 'flow';
}

/**
 * 'wait' holds a blank PepStep screen while sign-in state loads, so a
 * signed-in person on a new device is not pushed through the questions.
 * 'flow' is the starter questions. 'app' is the normal Home/Diary shell.
 */
export function onboardingGate(state, { signedIn = false, authReady = true, force = false, latched = false } = {}) {
  if (force) return 'flow';
  const settled = isOnboardingSettled(state?.onboarding);
  const prior = hasPriorActivity(state);
  if (latched && !settled) return 'flow';
  if (!settled && !prior && !signedIn && !authReady) return 'wait';
  if (!settled && !prior && !signedIn) return 'flow';
  return 'app';
}

function hasAnswers(onboarding) {
  const answers = onboarding?.answers || {};
  return Boolean(answers.goal || answers.experience || answers.daysPerWeek || (answers.comfort || []).length);
}

function answerRank(onboarding) {
  if (!onboarding) return 0;
  const answered = hasAnswers(onboarding);
  if (onboarding.status === 'completed' && answered) return 3;
  if (onboarding.status === 'completed' || (onboarding.status === 'skipped' && answered)) return 2;
  if (onboarding.status === 'skipped') return 1;
  return 0;
}

export function mergeOnboarding(local, cloud) {
  const a = normalizeOnboarding(local);
  const b = normalizeOnboarding(cloud);
  if (!a) return b;
  if (!b) return a;
  const aAnswers = hasAnswers(a);
  const bAnswers = hasAnswers(b);
  if (aAnswers !== bAnswers) return aAnswers ? a : b;
  if ((a.updatedAt || 0) !== (b.updatedAt || 0)) return a.updatedAt > b.updatedAt ? a : b;
  return answerRank(a) >= answerRank(b) ? a : b;
}

const GOAL_LINES = {
  move: 'Moving a little more, most days.',
  strength: 'Building strength you can use.',
  energy: 'Working toward more energy and stamina.',
  age: 'Staying active for the long run.',
};

const PLAN_LEADS = {
  move: 'A 16-week plan to move more.',
  strength: 'A 16-week plan to build strength at home.',
  energy: 'A 16-week plan for energy and stamina.',
  age: 'A 16-week plan to stay active.',
};

const PACE_LINES = {
  starting: ' Easy to start slowly.',
  some: ' Room to build on what you already do.',
  regular: ' A steady rhythm if you already train.',
};

const COMFORT_NAMES = { knees: 'knees', back: 'back', shoulders: 'shoulders' };

function savedAnswers(onboarding) {
  const normalized = normalizeOnboarding(onboarding);
  if (!normalized?.answers?.goal) return null;
  return normalized.answers;
}

export function homePersonalLine(onboarding) {
  const answers = savedAnswers(onboarding);
  if (!answers) return '';
  const goal = GOAL_LINES[answers.goal] || '';
  if (!goal) return '';
  const days = answers.daysPerWeek;
  const dayBit = days === 5 ? ' About 5 or more days a week.' : days ? ` About ${days} days a week.` : '';
  return `${goal}${dayBit}`;
}

export function planSuggestion(onboarding) {
  const answers = savedAnswers(onboarding);
  if (!answers) return '';
  const lead = PLAN_LEADS[answers.goal];
  if (!lead) return '';
  const pace = PACE_LINES[answers.experience] || '';
  const names = (answers.comfort || []).map((id) => COMFORT_NAMES[id]).filter(Boolean);
  const care = names.length ? ` Swap any move that is uncomfortable for your ${names.join(' or ')}.` : '';
  return `${lead}${pace} The plan repeats three training days and a rest day. You can go at your own pace.${care}`;
}
