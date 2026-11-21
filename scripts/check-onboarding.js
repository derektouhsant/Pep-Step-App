import { readFileSync } from 'node:fs';
import { mergeStates } from '../src/cloud/merge.js';
import { isMissingOnboardingColumn, loadProfile, profileWriteRow, saveProfile } from '../src/cloud/profile.js';
import {
  COMFORT_NOTE,
  buildOnboarding,
  cloneAnswers,
  homePersonalLine,
  mergeOnboarding,
  normalizeOnboarding,
  onboardingGate,
  planSuggestion,
  shouldOfferOnboarding,
  toggleComfort,
} from '../src/onboarding.js';
import { renderPrivacy } from '../src/privacy.js';
import { clearLocalState, defaultState, loadState, saveState } from '../src/storage.js';
import { renderHome } from '../src/views/home.js';
import { renderMore } from '../src/views/more.js';
import { renderOnboarding } from '../src/views/onboarding.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

const BANNED = [
  /\bglp\b/i,
  /\bpeptide/i,
  /\bozempic\b/i,
  /\bwegovy\b/i,
  /\bsemaglutide\b/i,
  /\bmedication/i,
  /\bdos(?:e|ing|age)\b/i,
  /weight[\s-]*loss/i,
  /fat[\s-]*loss/i,
  /\bdiagnosis\b/i,
  /\btreatment\b/i,
  /\bprescription\b/i,
];

function assertClean(label, text) {
  for (const pattern of BANNED) {
    assert(!pattern.test(text), `${label} should not include ${pattern}`);
  }
}

const fresh = defaultState();
assert(fresh.onboarding == null, 'a new store has no starter answers');
assert(shouldOfferOnboarding(fresh, { authReady: true }) === true, 'an empty install offers onboarding');
assert(onboardingGate(fresh, { authReady: false }) === 'wait', 'auth still loading should wait, not quiz a returning account');
assert(onboardingGate(fresh, { authReady: true, signedIn: true }) === 'app', 'a signed-in session skips onboarding');
assert(onboardingGate(fresh, { authReady: true }) === 'flow', 'a ready empty install shows the questions');

const withDiary = defaultState();
withDiary.diary = { '2026-11-01': { water: 1, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } } };
assert(hasPrior(withDiary), 'water already logged counts as existing data');
assert(shouldOfferOnboarding(withDiary) === false, 'existing diary data is not sent through onboarding');

const withPlan = defaultState();
withPlan.plans = [{ id: 'p', name: 'Plan' }];
assert(shouldOfferOnboarding(withPlan) === false, 'an existing plan skips onboarding');

const savedBefore = defaultState();
savedBefore.meta.savedAt = 100;
assert(shouldOfferOnboarding(savedBefore) === false, 'a store saved before this feature skips onboarding');

const completed = buildOnboarding('completed', { goal: 'strength', experience: 'starting', daysPerWeek: 3, comfort: ['knees'] }, 50);
const done = defaultState();
done.onboarding = completed;
assert(shouldOfferOnboarding(done) === false, 'completed onboarding does not return');
assert(onboardingGate(done, { force: true }) === 'flow', 'retake still opens the questions');
assert(onboardingGate(done, { latched: true }) === 'app', 'a settled flow does not stay latched');

const skipped = defaultState();
skipped.onboarding = buildOnboarding('skipped', { goal: 'move' }, 20);
assert(shouldOfferOnboarding(skipped) === false, 'skip is remembered');
assert(homePersonalLine(skipped.onboarding).includes('Moving a little more'), 'a skipped flow can still use answers already given');

assert(toggleComfort(['knees'], 'none').join() === 'none', 'none clears other comfort choices');
assert(toggleComfort(['none'], 'back').join() === 'back', 'a body area clears none');
assert(toggleComfort(['knees', 'back'], 'knees').join() === 'back', 'tapping a selected area removes it');
assert(cloneAnswers({ goal: 'nope', daysPerWeek: 9, comfort: ['knees', 'nope'] }).goal === '', 'unknown answers are dropped');

const older = buildOnboarding('completed', { goal: 'age', daysPerWeek: 2 }, 10);
const newer = buildOnboarding('completed', { goal: 'energy', daysPerWeek: 4, comfort: ['shoulders'] }, 80);
assert(mergeOnboarding(older, newer).answers.goal === 'energy', 'newer cloud answers win');
assert(mergeOnboarding(newer, older).answers.goal === 'energy', 'newer local answers win');
assert(mergeOnboarding(newer, null).answers.goal === 'energy', 'local answers survive an empty profile');
assert(mergeOnboarding(null, older).answers.goal === 'age', 'cloud answers fill an empty device');
const emptySkip = buildOnboarding('skipped', {}, 999);
assert(mergeOnboarding(emptySkip, older).answers.goal === 'age', 'an empty skip does not wipe saved answers');

const merged = mergeStates({ ...defaultState(), onboarding: older }, { ...defaultState(), onboarding: newer });
assert(merged.onboarding.answers.goal === 'energy', 'state merge keeps starter answers');
assert(merged.onboarding.answers.comfort[0] === 'shoulders', 'comfort answers survive merge');

const round = defaultState();
round.onboarding = completed;
saveState(round);
const loaded = loadState();
assert(loaded.onboarding.answers.goal === 'strength', 'starter answers round-trip through localStorage');
assert(loaded.onboarding.answers.daysPerWeek === 3, 'days per week round-trip as a number');
clearLocalState();
assert(loadState().onboarding == null, 'clear data removes starter answers');

assert(!profileWriteRow('user', defaultState(), 'now').onboarding, 'a profile write omits empty starter answers');
const row = profileWriteRow('user', { goals: { calories: 1 }, lastSets: {}, onboarding: completed }, 'now');
assert(row.onboarding.status === 'completed', 'a profile write includes starter answers when present');

const missing = { code: 'PGRST204', message: "Could not find the 'onboarding' column of 'profiles' in the schema cache" };
assert(isMissingOnboardingColumn(missing), 'a missing onboarding column is recognized');
assert(!isMissingOnboardingColumn({ code: '42501', message: 'permission denied' }), 'other profile errors stay errors');

const writes = [];
const legacy = {
  from() {
    return {
      upsert: async (payload) => {
        writes.push(payload);
        if (payload.onboarding) return { error: missing };
        return { error: null };
      },
    };
  },
};
await saveProfile(legacy, 'user', { goals: {}, lastSets: {}, onboarding: completed }, 'now');
assert(writes.length === 2, 'sync retries the profile save without starter answers when the column is missing');
assert(!writes[1].onboarding, 'the retry does not send starter answers');

let selects = 0;
const reader = {
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              maybeSingle: async () => {
                selects += 1;
                if (selects === 1) return { data: null, error: missing };
                return { data: { goals: { calories: 1800 }, last_sets: {} }, error: null };
              },
            };
          },
        };
      },
    };
  },
};
const profile = await loadProfile(reader, 'user');
assert(profile.goals.calories === 1800, 'profile load falls back when the onboarding column is missing');

const goalIds = ['move', 'strength', 'energy', 'age'];
const experiences = ['starting', 'some', 'regular'];
const comforts = [[], ['none'], ['knees'], ['back', 'shoulders']];
for (const goal of goalIds) {
  for (const experience of experiences) {
    for (const comfort of comforts) {
      const onboarding = buildOnboarding('completed', { goal, experience, daysPerWeek: 3, comfort });
      const personal = homePersonalLine(onboarding);
      const suggestion = planSuggestion(onboarding);
      assert(personal, `${goal} should produce a home line`);
      assert(suggestion.includes('three training days and a rest day'), 'the suggestion describes the real plan rhythm');
      assert(!/your plan is now|we changed the plan|days per week plan/i.test(suggestion), 'the suggestion does not invent a new plan');
      assertClean(`${goal}/${experience}`, `${personal}\n${suggestion}`);
    }
  }
}

const steps = ['welcome', 'goal', 'experience', 'days', 'comfort', 'save'];
for (const [index, id] of steps.entries()) {
  const html = renderOnboarding({
    stepIndex: index,
    draft: { goal: 'move', experience: 'some', daysPerWeek: 4, comfort: ['knees'] },
    privacyHref: '/privacy',
    email: 'you@example.com',
  });
  assert(html.includes(`data-onboard-step="${id}"`), `screen ${id} renders`);
  assert(html.includes('Skip'), `${id} shows Skip`);
  assert(html.includes('data-onboard-dot'), `${id} shows progress dots`);
  assertClean(id, html);
  if (index === 0) assert(!html.includes('data-act="onboard-back"'), 'welcome has no Back button');
  else assert(html.includes('data-act="onboard-back"'), `${id} has Back`);
}

const comfort = renderOnboarding({ stepIndex: 4 });
assert(comfort.includes(COMFORT_NOTE), 'the comfort screen includes the not-medical-advice line');
assert(comfort.includes('Not medical advice; check with your doctor before starting a new program'), 'the requested advice line is visible');

const save = renderOnboarding({ stepIndex: 5, privacyHref: '/privacy' });
assert(save.includes('Sign in with email'), 'the last screen can sign in with email');
assert(save.includes('Continue without an account'), 'the last screen can continue without an account');
assert(save.includes('fully usable without an account'), 'sign-in is described as optional');
assert(save.includes('href="/privacy"'), 'the sign-in screen links to the privacy policy');
assert(save.includes('data-onboard-auth'), 'sign-in reuses an email form');

const sent = renderOnboarding({ stepIndex: 5, sent: true, email: 'you@example.com', notice: 'Check your email' });
assert(sent.includes('Continue to PepStep'), 'after the link is sent, the app is still reachable');
assert(sent.includes('optional'), 'the sent screen still says an account is optional');

const home = renderHome({
  ...defaultState(),
  onboarding: buildOnboarding('completed', { goal: 'age', experience: 'starting', daysPerWeek: 2, comfort: ['back'] }),
});
assert(home.includes('data-home-personal'), 'home shows a short personalized line');
assert(home.includes('data-plan-suggestion'), 'home suggests the 16-week plan');
assert(home.includes('Build my 4-month plan'), 'the existing plan button stays');
assert(home.includes('Staying active for the long run'), 'the line follows the chosen goal');
assertClean('home', home);

const plainHome = renderHome(defaultState());
assert(!plainHome.includes('data-plan-suggestion'), 'home without answers keeps the original plan card');
assert(plainHome.includes('three days on and one day of rest'), 'the original plan sentence stays for people without answers');

const more = renderMore(defaultState(), { authEmail: '' }, { configured: true, status: 'offline', user: null });
assert(more.includes('Retake starter questions'), 'More can retake the starter questions');
assert(more.includes('data-act="retake-onboarding"'), 'the retake control is a button');
assertClean('more starter card', more.slice(more.indexOf('data-starter-questions'), more.indexOf('data-starter-questions') + 500));

const privacy = renderPrivacy();
assert(privacy.includes('Starter questions'), 'the privacy policy mentions starter questions');
assert(privacy.includes('November 21, 2026'), 'the privacy policy date includes this change');
assert(normalizeOnboarding({ status: 'nope', answers: { goal: 'move' } }) == null, 'unknown status is ignored');

const sql = readFileSync(new URL('../supabase/migrations/003_onboarding.sql', import.meta.url), 'utf8');
assert(sql.includes('add column if not exists onboarding jsonb'), 'the migration adds profiles.onboarding');
assert(sql.includes('notify pgrst'), 'the migration reloads the API schema');
assert(!/service_role/i.test(sql), 'the migration does not mention a service role key');

function hasPrior(state) {
  return shouldOfferOnboarding(state) === false && onboardingGate(state, { authReady: true }) === 'app';
}

console.log('onboarding checks ok');
