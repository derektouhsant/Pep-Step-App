import { PROGRAM_TEMPLATE } from './data/programTemplate.js';
import { getExercise } from './data/exercises.js';
import { treadmillBout } from './data/treadmill.js';
import { addDays, uid } from './utils.js';

const WEEK_COUNT = 16;

export function isProgramPlan(plan) {
  const doc = plan?.exercises;
  return Boolean(doc && typeof doc === 'object' && !Array.isArray(doc) && doc.kind === 'program');
}

export function programDoc(plan) {
  return isProgramPlan(plan) ? plan.exercises : null;
}

export function activeProgramPlan(state) {
  return (state?.plans || []).find((plan) => isProgramPlan(plan)) || null;
}

export function trainingPrefs(goals = {}) {
  const days = Number(goals?.daysPerWeek ?? goals?.trainingDays);
  const split = goals?.split || goals?.trainingSplit;
  return {
    daysPerWeek: Number.isFinite(days) && days >= 2 && days <= 6 ? days : null,
    split: typeof split === 'string' && split.trim() ? split.trim() : null,
  };
}

function phaseForWeek(phases, week) {
  return (phases || []).find((phase) => week >= phase.weeks[0] && week <= phase.weeks[1]) || null;
}

function assertTemplate(template) {
  if (!template || !Array.isArray(template.days) || template.days.length !== 7) {
    throw new Error('Program template needs exactly 7 days');
  }
  if (!Array.isArray(template.phases) || !template.phases.length) {
    throw new Error('Program template needs phases');
  }
  const covered = new Map();
  for (const phase of template.phases) {
    const [start, end] = phase.weeks || [];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      throw new Error(`Phase "${phase.name || ''}" has an invalid week range`);
    }
    for (let week = start; week <= end; week += 1) {
      if (covered.has(week)) {
        throw new Error(`Week ${week} is in more than one phase`);
      }
      covered.set(week, phase.name);
    }
  }
  for (let week = 1; week <= WEEK_COUNT; week += 1) {
    if (!covered.has(week)) throw new Error(`Program template does not cover week ${week}`);
  }
}

function selectSchedule(template, prefs) {
  const key = prefs.daysPerWeek != null ? String(prefs.daysPerWeek) : '';
  const variant = key && template.variants ? template.variants[key] : null;
  const days = variant?.days || template.days;
  if (!Array.isArray(days) || days.length !== 7) {
    throw new Error('Program template variant needs exactly 7 days');
  }
  return {
    days,
    daysPerWeek: variant?.daysPerWeek || template.daysPerWeek || days.filter((day) => !day.rest).length,
    split: variant?.split || prefs.split || template.split || 'upper-lower',
    appliedProfile: Boolean(variant),
  };
}

function materializeExercise(entry, phase) {
  const cat = getExercise(entry?.id);
  if (!cat) {
    throw new Error(`Program template exercise not in the library: ${entry?.id || '(missing id)'}`);
  }
  const treadmill = cat.log === 'treadmill';
  const cardio = treadmill || cat.log === 'duration' || cat.bodyPart === 'cardio';
  if (treadmill) {
    const minutes = Number(entry.minutes ?? phase.cardioMinutes ?? 20);
    return {
      exerciseId: cat.id,
      name: cat.name,
      bodyPart: cat.bodyPart,
      log: 'treadmill',
      sets: 1,
      reps: '',
      minutes,
      incline: entry.incline ?? 1,
      speed: entry.speed ?? 3,
      target: `${minutes} min`,
    };
  }
  if (cardio) {
    const minutes = entry.minutes ?? phase.cardioMinutes ?? 20;
    const sets = entry.sets ?? 1;
    const reps = String(entry.reps ?? minutes);
    return {
      exerciseId: cat.id,
      name: cat.name,
      bodyPart: cat.bodyPart,
      log: cat.log || 'duration',
      sets,
      reps,
      target: `${sets} × ${reps} min`,
    };
  }
  const sets = entry.sets ?? phase.sets ?? 3;
  const reps = String(entry.reps ?? phase.reps ?? '8');
  return {
    exerciseId: cat.id,
    name: cat.name,
    bodyPart: cat.bodyPart,
    log: cat.log || 'strength',
    sets,
    reps,
    target: `${sets} × ${reps}`,
  };
}

function materializeDay(day, phase) {
  if (day?.rest) return { name: day.name || 'Rest', rest: true, exercises: [] };
  return {
    name: day?.name || 'Workout',
    rest: false,
    exercises: (day?.exercises || []).map((entry) => materializeExercise(entry, phase)),
  };
}

export function expandTemplate(template, { startDate, goals, id, createdAt, generation } = {}) {
  assertTemplate(template);
  const prefs = trainingPrefs(goals);
  const schedule = selectSchedule(template, prefs);
  const weeks = [];
  for (let week = 1; week <= WEEK_COUNT; week += 1) {
    const phase = phaseForWeek(template.phases, week);
    weeks.push({
      week,
      phase: phase.name,
      days: schedule.days.map((day) => materializeDay(day, phase)),
    });
  }
  return {
    id: id || uid(),
    name: template.name || '4-month movement plan',
    source: 'program',
    createdAt: createdAt || Date.now(),
    exercises: {
      kind: 'program',
      version: 1,
      templateId: template.id || 'program',
      daysPerWeek: schedule.daysPerWeek,
      split: schedule.split,
      profile: {
        daysPerWeek: prefs.daysPerWeek,
        split: prefs.split,
        applied: schedule.appliedProfile,
      },
      startDate,
      nextIndex: 0,
      generation: generation || Date.now(),
      weeks,
    },
  };
}

export function buildProgramPlan(options = {}) {
  return expandTemplate(PROGRAM_TEMPLATE, options);
}

export function slotCount(doc) {
  return (doc?.weeks || []).reduce((total, week) => total + (week.days || []).length, 0);
}

export function slotAt(doc, index) {
  let cursor = index;
  const weeks = doc?.weeks || [];
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const days = weeks[weekIndex].days || [];
    if (cursor < days.length) {
      const day = days[cursor];
      return {
        index,
        weekIndex,
        dayIndex: cursor,
        week: weeks[weekIndex].week,
        phase: weeks[weekIndex].phase,
        totalWeeks: weeks.length,
        name: day.name,
        rest: Boolean(day.rest),
        exercises: day.exercises || [],
      };
    }
    cursor -= days.length;
  }
  return null;
}

export function daysFromStart(startDate, today) {
  if (!startDate || !today) return 0;
  const [ys, ms, ds] = String(startDate).split('-').map(Number);
  const [yt, mt, dt] = String(today).split('-').map(Number);
  if (![ys, ms, ds, yt, mt, dt].every((n) => Number.isFinite(n))) return 0;
  const start = Date.UTC(ys, ms - 1, ds);
  const end = Date.UTC(yt, mt - 1, dt);
  return Math.round((end - start) / 86400000);
}

function nextTraining(doc, fromIndex) {
  const total = slotCount(doc);
  for (let index = fromIndex; index < total; index += 1) {
    const slot = slotAt(doc, index);
    if (slot && !slot.rest) return slot;
  }
  return null;
}

export function resolveToday(plan, today) {
  const doc = programDoc(plan);
  if (!doc) return null;
  const total = slotCount(doc);
  const elapsed = Math.max(0, daysFromStart(doc.startDate, today));
  let index = Math.max(0, Number(doc.nextIndex) || 0);

  while (index < total && index < elapsed && slotAt(doc, index)?.rest) {
    index += 1;
  }

  if (index >= total) {
    return {
      kind: 'complete',
      plan,
      week: doc.weeks?.length || WEEK_COUNT,
      totalWeeks: doc.weeks?.length || WEEK_COUNT,
      phase: '',
      dayName: '',
    };
  }

  const slot = slotAt(doc, index);
  const scheduledDate = doc.startDate ? addDays(doc.startDate, index) : '';
  if (slot.rest) {
    const upcoming = nextTraining(doc, index + 1);
    return {
      kind: 'rest',
      plan,
      index,
      week: slot.week,
      totalWeeks: slot.totalWeeks,
      phase: slot.phase,
      dayName: slot.name || 'Rest',
      scheduledDate,
      next: upcoming
        ? {
            dayName: upcoming.name,
            week: upcoming.week,
            phase: upcoming.phase,
            exercises: upcoming.exercises,
            scheduledDate: doc.startDate ? addDays(doc.startDate, upcoming.index) : '',
          }
        : null,
    };
  }

  const ahead = index > elapsed;
  return {
    kind: ahead ? 'upcoming' : 'ready',
    plan,
    index,
    week: slot.week,
    totalWeeks: slot.totalWeeks,
    phase: slot.phase,
    dayName: slot.name,
    exercises: slot.exercises,
    queued: index < elapsed,
    scheduledDate,
  };
}

export function advanceProgram(plan, completedIndex, generation) {
  const doc = programDoc(plan);
  if (!doc) return false;
  if (generation != null && doc.generation != null && generation !== doc.generation) return false;
  const index = Number(completedIndex);
  if (!Number.isInteger(index) || index < 0) return false;
  if (index < doc.nextIndex) return false;
  doc.nextIndex = index + 1;
  return true;
}

export function swapProgramExercise(plan, { weekIndex, dayIndex, exerciseIndex, exerciseId }) {
  const doc = programDoc(plan);
  const day = doc?.weeks?.[weekIndex]?.days?.[dayIndex];
  if (!day || day.rest) return null;
  const current = day.exercises?.[exerciseIndex];
  const cat = getExercise(exerciseId);
  if (!current || !cat) return null;
  const treadmill = cat.log === 'treadmill';
  const cardio = treadmill || cat.log === 'duration' || cat.bodyPart === 'cardio';
  let next;
  if (treadmill) {
    const minutes = current.minutes || 20;
    next = {
      exerciseId: cat.id,
      name: cat.name,
      bodyPart: cat.bodyPart,
      log: 'treadmill',
      sets: 1,
      reps: '',
      minutes,
      incline: current.incline ?? 1,
      speed: current.speed ?? 3,
      target: `${minutes} min`,
    };
  } else if (cardio) {
    const sets = current.sets || 1;
    const reps = String(current.reps || current.minutes || 20);
    next = {
      exerciseId: cat.id,
      name: cat.name,
      bodyPart: cat.bodyPart,
      log: cat.log || 'duration',
      sets,
      reps,
      target: `${sets} × ${reps} min`,
    };
  } else {
    const sets = current.log === 'treadmill' || current.log === 'duration' ? 3 : current.sets || 3;
    const reps = current.log === 'treadmill' || current.log === 'duration' ? '8' : String(current.reps || '8');
    next = {
      exerciseId: cat.id,
      name: cat.name,
      bodyPart: cat.bodyPart,
      log: cat.log || 'strength',
      sets,
      reps,
      target: `${sets} × ${reps}`,
    };
  }
  day.exercises[exerciseIndex] = next;
  return next;
}

export function sessionExercises(list, lastSets = {}) {
  return (list || []).map((ex) => {
    const prev = lastSets[ex.exerciseId];
    if (ex.log === 'treadmill') {
      const minutes = Number(ex.minutes) || 20;
      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyPart,
        log: 'treadmill',
        target: ex.target || `${minutes} min`,
        sets: [
          treadmillBout({
            incline: prev?.incline ?? ex.incline,
            speed: prev?.speed ?? ex.speed,
            durationSec: prev?.durationSec ?? minutes * 60,
          }),
        ],
      };
    }
    const count = Math.max(1, Number(ex.sets) || 1);
    const reps = prev?.reps ?? ex.reps ?? '';
    const weight = prev?.weight ?? '';
    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      bodyPart: ex.bodyPart,
      log: ex.log || 'strength',
      target: ex.target || '',
      sets: Array.from({ length: count }, () => ({ weight, reps, done: false })),
    };
  });
}

export function phaseSpans(doc) {
  const spans = [];
  for (const week of doc?.weeks || []) {
    const last = spans[spans.length - 1];
    if (last && last.name === week.phase) last.end = week.week;
    else spans.push({ name: week.phase, start: week.week, end: week.week });
  }
  return spans;
}
