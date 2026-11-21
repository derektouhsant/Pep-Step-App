import { esc } from '../utils.js';
import { ONBOARDING_FLOW } from '../onboarding.js';

function dots(index) {
  return ONBOARDING_FLOW.map((step, i) => {
    const on = i === index ? ' on' : '';
    return `<span class="onboard-dot${on}" data-onboard-dot="${esc(step.id)}"></span>`;
  }).join('');
}

function nav(index) {
  const back =
    index > 0
      ? `<button type="button" class="onboard-back" data-act="onboard-back">Back</button>`
      : `<span class="onboard-back" aria-hidden="true"></span>`;
  return `
    <div class="onboard-nav">
      ${back}
      <div class="onboard-dots" role="status" aria-label="Step ${index + 1} of ${ONBOARDING_FLOW.length}">
        ${dots(index)}
      </div>
      <button type="button" class="onboard-skip" data-act="onboard-skip">Skip</button>
    </div>
  `;
}

function optionButton(step, draft, option) {
  const selected =
    step.field === 'comfort'
      ? (draft.comfort || []).includes(option.id)
      : step.field === 'daysPerWeek'
        ? String(draft.daysPerWeek ?? '') === option.id
        : draft[step.field] === option.id;
  return `
    <button type="button" class="onboard-option${selected ? ' selected' : ''}" data-act="onboard-option" data-id="${esc(option.id)}" aria-pressed="${selected ? 'true' : 'false'}">
      <span>${esc(option.label)}</span>
      ${option.hint ? `<small>${esc(option.hint)}</small>` : ''}
    </button>
  `;
}

function welcome() {
  return `
    <div class="onboard-main">
      <p class="tiny">Welcome</p>
      <h1>PepStep</h1>
      <p class="onboard-motto">Longevity is Movement</p>
      <p class="onboard-owned">Family owned · Veteran owned</p>
      <p class="onboard-lead">A few quick questions help PepStep suggest a starting point. It takes under a minute, and you can skip anytime.</p>
    </div>
    <div class="onboard-actions">
      <button type="button" class="primary-btn" data-act="onboard-next">Continue</button>
    </div>
  `;
}

function question(step, draft) {
  return `
    <div class="onboard-main">
      <h1>${esc(step.title)}</h1>
      ${step.optional ? '<p class="muted">Optional. Choose any that apply.</p>' : ''}
      <div class="onboard-options${step.id === 'days' ? ' days' : ''}">
        ${step.options.map((option) => optionButton(step, draft, option)).join('')}
      </div>
      ${step.note ? `<p class="onboard-note">${esc(step.note)}</p>` : ''}
    </div>
    ${
      step.multi
        ? `<div class="onboard-actions"><button type="button" class="primary-btn" data-act="onboard-next">Continue</button></div>`
        : ''
    }
  `;
}

function saveScreen({ draft, notice, privacyHref, sending, sent, email }) {
  const privacy = `<a class="privacy-inline" href="${esc(privacyHref)}" data-act="open-privacy">Privacy policy</a>`;
  if (sent) {
    return `
      <div class="onboard-main">
        <h1>Check your email</h1>
        <p class="onboard-lead">We sent a sign-in link${email ? ` to ${esc(email)}` : ''}. Open it on this device. You can use PepStep while you wait — an account is optional.</p>
        ${notice ? `<p class="account-notice" data-onboard-notice>${esc(notice)}</p>` : ''}
      </div>
      <div class="onboard-actions">
        <button type="button" class="primary-btn" data-act="onboard-enter">Continue to PepStep</button>
        <p class="disclaimer">${privacy}</p>
      </div>
    `;
  }
  return `
    <div class="onboard-main">
      <h1>Save your progress</h1>
      <p class="onboard-lead">Sign in with email to keep your diary, workouts, and these answers on another device. PepStep is fully usable without an account.</p>
      <form data-onboard-auth>
        <div class="field">
          <label for="onboard-email">Email</label>
          <input id="onboard-email" type="email" inputmode="email" autocomplete="email" data-act="auth-email" placeholder="you@email.com" value="${esc(email || '')}" />
        </div>
        <button class="primary-btn" type="submit" ${sending ? 'disabled' : ''}>${sending ? 'Sending link…' : 'Sign in with email'}</button>
      </form>
      <button type="button" class="onboard-secondary" data-act="onboard-next">Continue without an account</button>
      <p class="disclaimer">We email you a sign-in link. No password. ${privacy}</p>
      ${notice ? `<p class="warn" data-onboard-notice>${esc(notice)}</p>` : ''}
    </div>
  `;
}

export function renderOnboardingWait() {
  return `
    <div class="onboard welcome" data-onboarding-wait>
      <div class="onboard-main">
        <h1>PepStep</h1>
        <p class="onboard-motto">Longevity is Movement</p>
        <p class="onboard-owned">Family owned · Veteran owned</p>
      </div>
    </div>
  `;
}

export function renderOnboarding({
  stepIndex = 0,
  draft,
  notice = '',
  privacyHref = '/privacy',
  sending = false,
  sent = false,
  email = '',
} = {}) {
  const index = Math.min(Math.max(Number(stepIndex) || 0, 0), ONBOARDING_FLOW.length - 1);
  const step = ONBOARDING_FLOW[index];
  const answers = {
    goal: '',
    experience: '',
    daysPerWeek: null,
    comfort: [],
    ...(draft || {}),
  };
  const welcomeScreen = step.id === 'welcome';
  let body = '';
  if (welcomeScreen) body = welcome();
  else if (step.id === 'save') body = saveScreen({ draft: answers, notice, privacyHref, sending, sent, email });
  else body = question(step, answers);

  return `
    <div class="onboard${welcomeScreen ? ' welcome' : ''}" data-onboarding data-onboard-step="${esc(step.id)}">
      ${nav(index)}
      ${body}
    </div>
  `;
}
