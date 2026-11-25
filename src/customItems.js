import { BODY_PARTS } from './data/exercises.js';

export const CUSTOM_EXERCISE_LOCAL_NOTE =
  'Saved on this device. Exercises you add sync to your account after a one-time database update.';

const NAME_MAX = 80;
const SERVING_MAX = 40;
const PART_IDS = new Set(BODY_PARTS.map((part) => part.id));

export function cleanName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function nonNeg(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

/** Empty is 0. A typed value must be a non-negative number. Stored numbers are clamped by the caller. */
export function parseMacroInput(value) {
  if (typeof value === 'number') return { ok: true, value: nonNeg(value) };
  const raw = String(value ?? '')
    .trim()
    .replace(/,/g, '');
  if (!raw) return { ok: true, value: 0 };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, value: 0 };
  return { ok: true, value: Math.round(Number(raw) * 10) / 10 };
}

export function macroIssue(draft = {}) {
  const fields = [
    ['calories', 'Calories'],
    ['protein', 'Protein'],
    ['carbs', 'Carbs'],
    ['fat', 'Fat'],
  ];
  for (const [key, label] of fields) {
    if (!parseMacroInput(draft[key]).ok) return `${label} needs a number that is 0 or higher.`;
  }
  return '';
}

export function parseServingsInput(value) {
  const raw = String(value ?? '')
    .trim()
    .replace(/,/g, '');
  if (!raw) return { ok: true, value: 1 };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, value: 1 };
  const n = Math.round(Number(raw) * 10) / 10;
  if (n <= 0) return { ok: false, value: 1 };
  return { ok: true, value: n };
}

export function addCustomLabel(query) {
  const name = cleanName(query);
  if (!name) return 'Add custom';
  return `Add “${name}”`;
}

export function exactNameMatch(items, query) {
  const name = cleanName(query).toLowerCase();
  if (!name) return null;
  return (items || []).find((item) => cleanName(item?.name).toLowerCase() === name) || null;
}

/** Offer “Add …” when the typed name is not already a catalog or saved item. */
export function shouldOfferAdd(items, query) {
  const name = cleanName(query);
  if (!name) return false;
  return !exactNameMatch(items, name);
}

export function buildCustomFood({ id, name, serving, calories, carbs, protein, fat } = {}) {
  const cleaned = cleanName(name);
  if (!cleaned || !id) return null;
  const numbers = {
    calories: parseMacroInput(calories),
    carbs: parseMacroInput(carbs),
    protein: parseMacroInput(protein),
    fat: parseMacroInput(fat),
  };
  if (Object.values(numbers).some((item) => !item.ok)) return null;
  const label = String(serving ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SERVING_MAX);
  return {
    id: String(id),
    name: cleaned,
    serving: label || '1 serving',
    calories: numbers.calories.value,
    carbs: numbers.carbs.value,
    protein: numbers.protein.value,
    fat: numbers.fat.value,
    custom: true,
  };
}

export function normalizeCustomFood(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.name) return null;
  return buildCustomFood(raw);
}

export function normalizeCustomFoodList(list) {
  const out = [];
  const seen = new Set();
  for (const item of list || []) {
    const next = normalizeCustomFood(item);
    if (!next || seen.has(next.id)) continue;
    seen.add(next.id);
    out.push(next);
  }
  return out;
}

export function exerciseKindFromLog(log) {
  return log === 'duration' || log === 'cardio' ? 'cardio' : 'strength';
}

export function exerciseLogFromKind(kind) {
  return kind === 'cardio' || kind === 'duration' ? 'duration' : 'strength';
}

export function exerciseKindLabel(exercise) {
  if (exercise?.log === 'treadmill') return 'Treadmill';
  if (exerciseKindFromLog(exercise?.log) === 'cardio') return 'Cardio';
  return 'Strength';
}

export function validBodyPart(id, fallback = 'full-body') {
  return PART_IDS.has(id) ? id : fallback;
}

export function buildCustomExercise({ id, name, kind, bodyPart, log } = {}) {
  const cleaned = cleanName(name);
  if (!cleaned || !id) return null;
  const resolvedLog = log === 'duration' || log === 'strength' ? log : exerciseLogFromKind(kind);
  const fallback = resolvedLog === 'duration' ? 'cardio' : 'full-body';
  return {
    id: String(id),
    name: cleaned,
    bodyPart: validBodyPart(bodyPart, fallback),
    equipment: 'Custom',
    log: resolvedLog,
    custom: true,
    videoPlaceholder: true,
  };
}

export function normalizeCustomExercise(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.name) return null;
  return buildCustomExercise({
    id: raw.id,
    name: raw.name,
    bodyPart: raw.bodyPart || raw.body_part,
    log: raw.log,
    kind: raw.kind,
  });
}

export function normalizeCustomExerciseList(list) {
  const out = [];
  const seen = new Set();
  for (const item of list || []) {
    const next = normalizeCustomExercise(item);
    if (!next || seen.has(next.id)) continue;
    seen.add(next.id);
    out.push(next);
  }
  return out;
}

/**
 * True when PostgREST or Postgres says custom_exercises is not installed yet.
 * Permission errors stay errors so a real RLS failure is not hidden.
 */
export function isMissingCustomExercisesTable(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase();
  if (!message.includes('custom_exercises')) return false;
  if (code === '42501' || /permission denied|row-level security|\brls\b|jwt/.test(message)) return false;
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return true;
  return /does not exist|schema cache|could not find|undefined/.test(message);
}

export function customExerciseToRow(userId, exercise, now) {
  const item = normalizeCustomExercise(exercise);
  if (!item) return null;
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    body_part: item.bodyPart,
    log: item.log === 'duration' ? 'duration' : 'strength',
    updated_at: now,
  };
}

export function rowToCustomExercise(row) {
  if (!row) return null;
  return normalizeCustomExercise({
    id: row.id,
    name: row.name,
    bodyPart: row.body_part,
    log: row.log,
  });
}
