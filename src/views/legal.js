import { esc } from '../utils.js';

/** Placeholder until Derek replaces it before App Store submission. */
export const SUPPORT_EMAIL = 'derektouhsant@gmail.com';
export const SUPPORT_EMAIL_NOTE = 'Placeholder — Derek, swap this address before you submit.';
export const PUBLIC_ORIGIN = 'https://pep-step-app.vercel.app';

const PAGES = new Set(['privacy', 'support', 'terms']);

export function legalPageFromPath(pathname) {
  const cleaned = String(pathname || '/')
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  const last = (parts[parts.length - 1] || '').toLowerCase();
  if (!PAGES.has(last) || parts.length > 2) return null;
  return last;
}

export function legalTitle(page) {
  if (page === 'privacy') return 'Privacy policy — PepStep';
  if (page === 'support') return 'Support — PepStep';
  if (page === 'terms') return 'Terms — PepStep';
  return 'PepStep';
}

function emailBlock() {
  return `
    <p><a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a></p>
    <p class="draft-note">${esc(SUPPORT_EMAIL_NOTE)}</p>
  `;
}

function medicalNote() {
  return `
    <h2>Not medical advice</h2>
    <p>PepStep is for logging meals, water, and movement. It is not medical advice, diagnosis, or treatment, and it is not a medical device. It does not provide peptide, medication, or weight-loss guidance. Talk with a qualified clinician about health questions. If you think you have a medical emergency, call emergency services.</p>
  `;
}

function nav(current) {
  const links = [
    ['privacy', 'Privacy'],
    ['support', 'Support'],
    ['terms', 'Terms'],
  ];
  return `
    <nav class="legal-nav" aria-label="Policies">
      ${links
        .map(([page, label]) =>
          page === current
            ? `<span aria-current="page">${label}</span>`
            : `<a href="/${page}" data-act="open-legal" data-page="${page}">${label}</a>`
        )
        .join('')}
    </nav>
  `;
}

function shell(page, title, body) {
  return `
    <div class="legal-shell">
      <div class="legal-wrap">
        <header class="legal-brand">
          <div class="brand-name">PepStep</div>
          <div class="brand-tag">Longevity is Movement</div>
        </header>
        <article class="card legal-doc">
          <h1>${esc(title)}</h1>
          ${nav(page)}
          ${body}
        </article>
        <button class="steel-btn legal-back" data-act="close-legal">Back to PepStep</button>
      </div>
    </div>
  `;
}

function privacyBody() {
  return `
    <p class="draft-banner">Draft for Derek to review. This is not legal advice and it is not a finished privacy policy. Replace this copy before you submit PepStep to the App Store.</p>
    <p>PepStep (“we”) is a family-owned, veteran-owned app for logging meals and movement. This page says what the app collects, why, and how to delete it. The live copy is at <a href="${PUBLIC_ORIGIN}/privacy">${PUBLIC_ORIGIN}/privacy</a>.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Email address</strong>, if you ask for a magic-link sign-in. We use it only to sign you in and to reach you about your account.</li>
      <li><strong>Diary and food</strong> you enter: meals, calories, carbs, protein, fat, water, daily goals, and custom foods.</li>
      <li><strong>Workouts</strong> you enter: sessions, plans, sets, reps, load, and treadmill incline, speed, and time.</li>
      <li><strong>Apple Health data, once you turn it on</strong> (iPhone app only): workouts, including treadmill, walking, and running; active energy; heart rate; and steps. This access is <strong>read-only</strong>. PepStep shows it inside the app. PepStep does not write to Apple Health.</li>
    </ul>
    <p>Until you sign in, diary and workout entries stay on this device (browser storage). We do not ask for your name, contacts, photos, or location.</p>

    <h2>How we use it</h2>
    <p>We use this information to show your log, to sync it to your account when you are signed in, and — if you allow Apple Health — to show steps and workouts recorded on your Watch or iPhone. We use email to send the sign-in link and to reply if you contact support.</p>
    <p>We do not sell your information. We do not use it for advertising. We do not share it with third parties for their own marketing or analytics.</p>

    <h2>Who stores it</h2>
    <p>When you sign in, your account and synced logs are stored by <strong>Supabase</strong> (database and authentication), which processes that data for us so the app can sync. The iPhone app is built with Apple’s tools; Apple Health data is read from Apple’s Health store on your device. We do not run our own video hosting. The website is served by Vercel.</p>

    <h2>How to delete your account</h2>
    <p>In the app, open <strong>More → Account → Delete account</strong> and confirm. That deletes your synced diary, foods, workouts, and plans, deletes the sign-in itself, and clears PepStep data on that device. You can also email us and ask us to delete the account. Deleting the account cannot be undone.</p>

    <h2>Contact</h2>
    ${emailBlock()}
    ${medicalNote()}
    <h2>Changes</h2>
    <p>If this policy changes, the new version will be posted on this page.</p>
  `;
}

function supportBody() {
  return `
    <p>PepStep is Home, Diary, Workouts, and More. Family owned · Veteran owned.</p>
    <h2>Contact</h2>
    <p>Email us and include the address you use to sign in, plus what you expected to happen.</p>
    ${emailBlock()}
    <h2>App Store and web addresses</h2>
    <ul>
      <li>App: <a href="${PUBLIC_ORIGIN}">${PUBLIC_ORIGIN}</a></li>
      <li>Privacy: <a href="${PUBLIC_ORIGIN}/privacy">${PUBLIC_ORIGIN}/privacy</a></li>
      <li>Support: <a href="${PUBLIC_ORIGIN}/support">${PUBLIC_ORIGIN}/support</a></li>
      <li>Terms: <a href="${PUBLIC_ORIGIN}/terms">${PUBLIC_ORIGIN}/terms</a></li>
    </ul>
    <h2>Signing in</h2>
    <p>More → Account → enter your email → Email me a magic link. Open the link on the same device. Each link works once. Check spam if it does not arrive.</p>
    <h2>Delete your account</h2>
    <p>Sign in, then More → Account → Delete account. Confirm to remove synced data and the sign-in. See the <a href="/privacy" data-act="open-legal" data-page="privacy">privacy policy</a> for what that includes.</p>
    <h2>Apple Health</h2>
    <p>On the iPhone app you can choose to read workouts, steps, active energy, and heart rate from Apple Health. PepStep does not write to Apple Health. You can turn access off in the iOS Settings app under Health → Data Access &amp; Devices → PepStep.</p>
    ${medicalNote()}
  `;
}

function termsBody() {
  return `
    <p class="draft-note">Draft for Derek to review. This is not legal advice. Replace this copy before you submit.</p>
    <p>These terms cover the PepStep app and the site at ${PUBLIC_ORIGIN}. By using PepStep you agree to them.</p>
    <h2>The app</h2>
    <p>PepStep lets you log meals, water, and workouts, and optionally read Apple Health data you allow. It is a personal log. It does not sell peptides, medications, or coaching, and those tools are not part of this app.</p>
    ${medicalNote()}
    <h2>Your account</h2>
    <p>You can use PepStep without an account; data then stays on the device. If you create an account, you are responsible for the email you use. You can delete the account in More → Account → Delete account.</p>
    <h2>Apple Health</h2>
    <p>Health access is optional and read-only. You can refuse it and still use the rest of PepStep. We do not write workouts or other data into Apple Health.</p>
    <h2>Acceptable use</h2>
    <p>Don’t misuse the service, attempt to access someone else’s account, or use PepStep to harm others.</p>
    <h2>As-is</h2>
    <p>PepStep is provided as-is. We don’t promise that logs, estimates, or Apple Health imports are complete or error-free. To the extent the law allows, we are not liable for decisions you make from what you see in the app.</p>
    <h2>Contact</h2>
    ${emailBlock()}
  `;
}

export function renderLegalPage(page) {
  if (page === 'support') return shell(page, 'Support', supportBody());
  if (page === 'terms') return shell(page, 'Terms', termsBody());
  return shell(page, 'Privacy policy', privacyBody());
}
