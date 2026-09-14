const KEY = 'pepstep:v1';

const DEFAULT_GOALS = {
  calories: 2200,
  carbs: 220,
  protein: 170,
  fat: 70,
  waterCups: 8,
};

export function defaultState() {
  return {
    goals: { ...DEFAULT_GOALS },
    diary: {},
    customFoods: [],
    activeWorkout: null,
    workoutHistory: [],
    plans: [],
    lastSets: {},
  };
}

export function emptyDay() {
  return {
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    },
    water: 0,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
      diary: parsed.diary || {},
      customFoods: parsed.customFoods || [],
      workoutHistory: parsed.workoutHistory || [],
      plans: parsed.plans || [],
      lastSets: parsed.lastSets || {},
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDay(state, iso) {
  return state.diary[iso] || emptyDay();
}
