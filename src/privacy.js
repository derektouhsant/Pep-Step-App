export const PRIVACY_PUBLIC_URL = 'https://pep-step-app.vercel.app/privacy';

export function isPrivacyPath(pathname) {
  const path = String(pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  return path === '/privacy';
}

export function privacyHref(native) {
  return native ? PRIVACY_PUBLIC_URL : '/privacy';
}

export function renderPrivacy({ fromApp = false } = {}) {
  const backLabel = fromApp ? 'Back' : 'Open PepStep';
  return `
    <div class="privacy-page" data-privacy-page>
      <header class="privacy-header">
        <button type="button" class="privacy-back" data-act="close-privacy">${backLabel}</button>
        <div class="brand">
          <div class="brand-name">PepStep</div>
          <div class="brand-tag">Privacy policy</div>
        </div>
      </header>
      <article class="privacy-body">
        <p class="tiny">Effective October 6, 2026</p>
        <h1>Privacy policy</h1>
        <p>PepStep (<a href="https://pepstepguide.com" target="_blank" rel="noopener noreferrer">pepstepguide.com</a>) operates the PepStep app. PepStep is family-owned and veteran-owned.</p>
        <p>This policy covers the PepStep website and the iPhone app: Home, Diary, Workouts, and More. It is a log for meals, movement, and workouts. Questions go to <a href="mailto:support@pepstepguide.com">support@pepstepguide.com</a>.</p>

        <h2>Information the app collects</h2>
        <p><strong>Email, if you sign in.</strong> Sign-in is optional. PepStep sends your email address to Supabase, which emails you a one-time magic link. There is no password.</p>
        <p><strong>Diary and food logs you enter.</strong> Foods and meals (name, serving, number of servings, calories, carbohydrates, protein, and fat), water, daily goals (calories, carbohydrates, protein, fat, and water), and custom foods you save (name, serving, calories, and those same amounts).</p>
        <p><strong>Workout logs you enter.</strong> Session name, start and finish time, exercises, and the sets you type (weight and reps; minutes and calories for cardio; incline, speed, and time for treadmill). Also workout plans you save (name and exercises) and the last values PepStep keeps so it can show previous performance.</p>
        <p><strong>Apple Health, on iPhone, only if you turn it on.</strong> PepStep asks for read-only access to steps, heart rate, active energy, and workouts. It does not write to Apple Health. With permission, the app reads today’s step count and walking, running, and treadmill workouts from about the last 90 days, including duration, distance, energy burned on the workout, and heart-rate samples used to show an average heart rate. That information stays on the iPhone, including a local cache. It is not uploaded to your PepStep account and it is not stored in Supabase.</p>

        <h2>Where it is stored</h2>
        <p>If you are not signed in, diary, goals, workouts, and plans stay on that device (the browser, or the iPhone app). They are not sent to PepStep.</p>
        <p>If you are signed in, those same logs are saved to your account and synced through Supabase so another signed-in device can load them. When you sign in, PepStep combines the logs already on the device with the logs in the account.</p>
        <p>Apple Health data stays on the iPhone either way.</p>

        <h2>Why</h2>
        <p>PepStep uses this information to show your diary and workouts, to sync them across devices when you sign in, and, if you connect Apple Health, to show steps and those workouts next to what you log in the app.</p>

        <h2>Selling, advertising, and Apple Health</h2>
        <p>PepStep does not sell your information. PepStep does not use your information for advertising.</p>
        <p>Apple Health data is not shared with third parties. It is not used for marketing or advertising. It is not sent to Supabase or Vercel.</p>

        <h2>How to delete your account</h2>
        <p>Open the More tab while you are signed in and tap <strong>Delete account</strong>. PepStep asks you to confirm twice. The warning says this permanently deletes your account and all synced diary and workout data, and that it cannot be undone.</p>
        <p>When you confirm, PepStep deletes the sign-in and the synced records (profile, diary days, custom foods, workout sessions, and workout plans), signs you out, and clears PepStep data stored on that device, including the Apple Health cache. The Apple Health connection inside PepStep is turned off so that cache is not filled again until you connect it. Data that remains in the Apple Health app itself is left as it is.</p>
        <p>You can also email <a href="mailto:support@pepstepguide.com">support@pepstepguide.com</a> and ask us to delete the account.</p>
        <p>Signing out leaves the copy on that device in place. Clear data (also on the More tab) removes diary and workout data and, when you are signed in, the synced copy. It does not delete the sign-in. Delete account does.</p>

        <h2>Service providers</h2>
        <ul>
          <li><strong>Supabase</strong> hosts sign-in and the database that stores your account and synced diary, food, and workout logs.</li>
          <li><strong>Vercel</strong> hosts the PepStep website at pep-step-app.vercel.app.</li>
          <li><strong>Apple</strong> provides HealthKit on the iPhone. PepStep reads the types listed above on the device.</li>
          <li>The website loads font files from Google Fonts (fonts.googleapis.com and fonts.gstatic.com).</li>
        </ul>

        <h2>Children</h2>
        <p>PepStep is not directed at children under 13, and PepStep does not knowingly collect personal information from children under 13. If you believe a child has provided personal information, email <a href="mailto:support@pepstepguide.com">support@pepstepguide.com</a> and we will delete it.</p>

        <h2>Changes</h2>
        <p>PepStep may update this policy. When that happens, the effective date on this page will change. This version is effective October 6, 2026.</p>

        <h2>Contact</h2>
        <p>PepStep<br />pepstepguide.com<br /><a href="mailto:support@pepstepguide.com">support@pepstepguide.com</a></p>
        <p>PepStep is a log for movement and meals. It does not provide medical advice, diagnosis, or treatment.</p>
      </article>
    </div>
  `;
}
