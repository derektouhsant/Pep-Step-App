/** Treadmill bouts live on the same exercise/set model as strength. */

export const LOG_TREADMILL = 'treadmill';

const DEFAULT_INCLINE = 1;
const DEFAULT_SPEED = 3;
const DEFAULT_DURATION_SEC = 20 * 60;
const MAX_MINUTES = 180;

function range(start, end, step) {
  const out = [];
  const count = Math.round((end - start) / step);
  for (let i = 0; i <= count; i += 1) {
    const value = start + i * step;
    out.push(step >= 1 ? Math.round(value) : Math.round(value * 10) / 10);
  }
  return out;
}

export const INCLINE_VALUES = range(0, 15, 0.5);
export const SPEED_VALUES = range(1, 12, 0.1);
export const MINUTE_VALUES = range(0, MAX_MINUTES, 1);
export const SECOND_VALUES = range(0, 59, 1);

export function closest(values, target, fallback) {
  const n = Number(target);
  if (!Number.isFinite(n) || !values.length) return fallback;
  let best = values[0];
  let dist = Infinity;
  for (const value of values) {
    const d = Math.abs(value - n);
    if (d < dist) {
      dist = d;
      best = value;
    }
  }
  return best;
}

export function normalizeDuration(sec) {
  let total = Math.round(Number(sec));
  if (!Number.isFinite(total) || total < 0) total = 0;
  const max = MAX_MINUTES * 60 + 59;
  if (total > max) total = max;
  return total;
}

export function splitDuration(sec) {
  const total = normalizeDuration(sec);
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

export function formatIncline(n) {
  const v = Math.round(Number(n) * 10) / 10;
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
}

export function formatSpeed(n) {
  const v = Math.round(Number(n) * 10) / 10;
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(1)} mph`;
}

export function formatClock(sec) {
  const { minutes, seconds } = splitDuration(sec);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatBout(set) {
  if (!set) return '';
  return `${formatIncline(set.incline)} incline · ${formatSpeed(set.speed)} · ${formatClock(set.durationSec)}`;
}

export function isTreadmillSet(set) {
  if (!set || typeof set !== 'object') return false;
  if (set.kind === LOG_TREADMILL) return true;
  return set.incline != null && set.speed != null && set.durationSec != null && set.weight == null && set.reps == null;
}

export function isTreadmillBlock(ex) {
  if (!ex) return false;
  if (ex.log === LOG_TREADMILL) return true;
  return (ex.sets || []).some((set) => isTreadmillSet(set));
}

export function treadmillBout(source) {
  const incline = closest(INCLINE_VALUES, source?.incline, DEFAULT_INCLINE);
  const speed = closest(SPEED_VALUES, source?.speed, DEFAULT_SPEED);
  const durationSec =
    source && source.durationSec != null ? normalizeDuration(source.durationSec) : DEFAULT_DURATION_SEC;
  return {
    kind: LOG_TREADMILL,
    incline,
    speed,
    durationSec,
    done: false,
  };
}

export function formatTreadmillPrevious(prev) {
  if (!isTreadmillSet(prev) && prev?.kind !== LOG_TREADMILL) return '';
  if (prev?.incline == null || prev?.speed == null || prev?.durationSec == null) return '';
  return `Previous: ${formatBout(prev)}`;
}

export function treadmillDetailLines(ex) {
  const name = ex?.name || 'Treadmill';
  const bouts = (ex?.sets || []).filter((set) => isTreadmillSet(set));
  if (!bouts.length) return [name];
  if (bouts.length === 1) return [`${name} · ${formatBout(bouts[0])}`];
  return bouts.map((bout, index) => `${name} ${index + 1} · ${formatBout(bout)}`);
}

export function workoutTreadmillLines(workout) {
  const lines = [];
  for (const ex of workout?.exercises || []) {
    if (!isTreadmillBlock(ex)) continue;
    lines.push(...treadmillDetailLines(ex));
  }
  return lines;
}

export function workoutSummary(workout) {
  const count = (workout?.exercises || []).length;
  const noun = `${count} exercise${count === 1 ? '' : 's'}`;
  const lines = workoutTreadmillLines(workout);
  if (!lines.length) return noun;
  return `${noun} · ${lines.join(' · ')}`;
}
