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

function assertWeekCoverage(covered, label) {
  for (let week = 1; week <= WEEK_COUNT; week += 1) {
    if (!covered.has(week)) throw new Error(`${label} does not cover week ${week}`);
  }
}

function assertTemplate(template) {
  const cycle = template?.cycle;
  const days = template?.days;
  if (Array.isArray(cycle)) {
    if (cycle.length < 2) throw new Error('Program cycle needs at least 2 days');
  } else if (!Array.isArray(days) || days.length !== 7) {
    throw new Error('Program template needs exactly 7 days or a cycle');
  }
  if (Array.isArray(template?.weekPlan)) {
    if (template.weekPlan.length !== WEEK_COUNT) {
      throw new Error(`Program weekPlan needs ${WEEK_COUNT} weeks`);
    }
    const covered = new Map();
    for (const row of template.weekPlan) {
      if (!Number.isInteger(row.week) || covered.has(row.week)) {
        throw new Error(`Week ${row.week} is missing or repeated in weekPlan`);
      }
      covered.set(row.week, row.phase || '');
    }
    assertWeekCoverage(covered, 'Program weekPlan');
    return;
  }
  if (!Array.isArray(template?.phases) || !template.phases.length) {
    throw new Error('Program template needs phases');
  }
  const covered = new Map();
  for (const phase of template.phases) {
    const [start, end] = phase.weeks || [];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      throw new Error(`Phase "${phase.name || ''}" has an invalid week range`);
    }
    for (let week = start; week <= end; week += 1) {
      if (covered.has(week)) throw new Error(`Week ${week} is in more than one phase`);
      covered.set(week, phase.name);
    }
  }
  assertWeekCoverage(covered, 'Program template phases');
}

function selectSchedule(template, prefs) {
  if (Array.isArray(template.cycle) && template.cycle.length >= 2) {
    return {
      cycle: template.cycle,
      daysPerWeek: null,
      split: template.split || '3 days on, 1 rest',
      appliedProfile: false,
    };
  }
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

function formatDose(n) {
  const value = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function intervalBouts(minutes, easy, brisk) {
  const bouts = [];
  let left = minutes;
  while (left > 0) {
    const easyMin = Math.min(5, left);
    bouts.push({ ...easy, minutes: easyMin });
    left -= easyMin;
    if (left <= 0) break;
    const briskMin = Math.min(2, left);
    bouts.push({ ...brisk, minutes: briskMin });
    left -= briskMin;
  }
  return bouts;
}

function useHarderVariation(entry, phase) {
  const harder = entry?.harder;
  if (!harder || phase?.recovery) return null;
  if (Number(phase?.week) >= Number(harder.fromWeek)) return harder;
  return null;
}

function treadmillDose(entry, phase) {
  const minutes = Number(entry.minutes ?? phase.cardioMinutes ?? 20);
  if (entry.style === 'incline') {
    const incline = entry.incline ?? phase.incline ?? 3;
    const speed = entry.speed ?? phase.walkSpeed ?? 2.5;
    return {
      minutes,
      incline,
      speed,
      target: `${minutes} min · ${formatDose(incline)}% · ${formatDose(speed)} mph`,
    };
  }
  if (entry.style === 'easy') {
    const incline = entry.incline ?? 1;
    const speed = entry.speed ?? phase.easySpeed ?? 2.5;
    return {
      minutes,
      incline,
      speed,
      target: `${minutes} min · ${formatDose(incline)}% · ${formatDose(speed)} mph`,
    };
  }
  if (entry.style === 'intervals') {
    const easy = { incline: 1, speed: phase.easySpeed ?? 2.5 };
    const brisk = { incline: 1, speed: phase.briskSpeed ?? 3.2 };
    const bouts = intervalBouts(minutes, easy, brisk);
    return {
      minutes,
      incline: easy.incline,
      speed: easy.speed,
      bouts,
      target: `${minutes} min · easy and brisk walks`,
    };
  }
  return {
    minutes,
    incline: entry.incline ?? 1,
    speed: entry.speed ?? 3,
    target: `${minutes} min`,
  };
}

function materializeExercise(entry, phase) {
  const harder = useHarderVariation(entry, phase);
  const cat = getExercise(harder?.id || entry?.id);
  if (!cat) {
    throw new Error(`Program template exercise not in the library: ${harder?.id || entry?.id || '(missing id)'}`);
  }
  const name = (harder ? harder.name : entry.name) || cat.name;
  const treadmill = cat.log === 'treadmill' || entry.style === 'incline' || entry.style === 'easy' || entry.style === 'intervals';
  const cardio = treadmill || cat.log === 'duration' || cat.bodyPart === 'cardio';
  if (treadmill || entry.style) {
    const dose = treadmillDose(entry, phase);
    return {
      exerciseId: cat.log === 'treadmill' ? cat.id : 'treadmill',
      name,
      bodyPart: 'cardio',
      log: 'treadmill',
      sets: dose.bouts?.length || 1,
      reps: '',
      minutes: dose.minutes,
      incline: dose.incline,
      speed: dose.speed,
      bouts: dose.bouts,
      target: dose.target,
    };
  }
  if (cardio) {
    const minutes = entry.minutes ?? phase.cardioMinutes ?? 20;
    const sets = entry.sets ?? 1;
    const reps = String(entry.reps ?? minutes);
    return {
      exerciseId: cat.id,
      name,
      bodyPart: cat.bodyPart,
      log: cat.log || 'duration',
      sets,
      reps,
      target: `${sets} × ${reps} min`,
    };
  }
  const sets = harder?.sets ?? entry.sets ?? phase.sets ?? 3;
  if (entry.hold) {
    const hold = harder?.holdSec ?? phase.holdSec ?? 20;
    return {
      exerciseId: cat.id,
      name,
      bodyPart: cat.bodyPart,
      log: cat.log || 'strength',
      sets,
      reps: String(hold),
      hold: true,
      target: `${sets} × ${hold} sec`,
    };
  }
  const reps = String(harder?.reps ?? entry.reps ?? phase.reps ?? '8');
  return {
    exerciseId: cat.id,
    name,
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

function weekRows(template) {
  if (Array.isArray(template.weekPlan)) return template.weekPlan;
  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const week = index + 1;
    const phase = phaseForWeek(template.phases, week);
    return { ...phase, week, phase: phase.name };
  });
}

export function expandTemplate(template, { startDate, goals, id, createdAt, generation } = {}) {
  assertTemplate(template);
  const prefs = trainingPrefs(goals);
  const schedule = selectSchedule(template, prefs);
  const rows = weekRows(template);
  const weeks = [];
  for (const row of rows) {
    const phase = { ...row, name: row.phase || row.name };
    let days;
    if (schedule.cycle) {
      days = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const absolute = (row.week - 1) * 7 + dayIndex;
        const pattern = schedule.cycle[absolute % schedule.cycle.length];
        days.push(materializeDay(pattern, phase));
      }
    } else {
      days = schedule.days.map((day) => materializeDay(day, phase));
    }
    weeks.push({ week: row.week, phase: phase.name, days });
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
      level: template.level || '',
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
      const prescribed = Array.isArray(ex.bouts) && ex.bouts.length
        ? ex.bouts
        : [{ minutes, incline: ex.incline, speed: ex.speed }];
      const usePrevious = prescribed.length === 1 && prev?.durationSec != null && ex.incline == null && ex.speed == null;
      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyPart,
        log: 'treadmill',
        target: ex.target || `${minutes} min`,
        sets: prescribed.map((bout) =>
          treadmillBout({
            incline: usePrevious ? prev.incline : bout.incline,
            speed: usePrevious ? prev.speed : bout.speed,
            durationSec: usePrevious ? prev.durationSec : (Number(bout.minutes) || minutes) * 60,
          })
        ),
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
