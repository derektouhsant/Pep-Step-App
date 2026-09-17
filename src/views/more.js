import { esc } from '../utils.js';

export function renderInstallTip({ compact = false } = {}) {
  const steps = `
    <ol class="install-steps">
      <li>Open PepStep in <strong>Safari</strong> on iPhone (not Chrome or an in-app browser).</li>
      <li>Tap the <strong>Share</strong> button.</li>
      <li>Scroll and tap <strong>Add to Home Screen</strong>, then Add.</li>
    </ol>
  `;
  if (compact) {
    return `
      <div class="install-banner" role="note">
        <div>
          <div class="tiny">iPhone</div>
          <p>Add PepStep to your Home Screen for a full-screen app.</p>
        </div>
        <button class="text-btn" data-act="dismiss-a2hs">Got it</button>
      </div>
    `;
  }
  return `
    <section class="card">
      <div class="tiny">Add to Home Screen</div>
      <p class="disclaimer">PepStep is a mobile web app. On iPhone it installs like a native app from Safari, with navy branding and Home Screen icon.</p>
      ${steps}
    </section>
  `;
}

function syncLabel(cloud) {
  if (!cloud.configured) return 'Not configured';
  if (!cloud.user) return 'Offline on this device';
  if (cloud.status === 'syncing' || cloud.status === 'pending') return 'Syncing…';
  if (cloud.status === 'error') return 'Sync error';
  if (cloud.status === 'synced') return 'Synced';
  return 'Signed in';
}

function syncTime(cloud) {
  if (!cloud.lastSyncedAt) return '';
  try {
    return `Last sync ${new Date(cloud.lastSyncedAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
}

export function renderAccount(cloud, ui) {
  const status = syncLabel(cloud);
  const tone =
    cloud.status === 'error' ? 'err' : cloud.status === 'synced' ? 'ok' : cloud.user ? 'pending' : 'off';

  if (!cloud.configured) {
    return `
      <section class="card">
        <div class="tiny">Account</div>
        <div class="row" style="margin:8px 0 10px">
          <strong>Cloud sync</strong>
          <span class="sync-pill ${tone}" data-sync-pill>${esc(status)}</span>
        </div>
        <p class="disclaimer">Accounts are optional. Without <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, PepStep stays on this browser via localStorage.</p>
      </section>
    `;
  }

  if (cloud.user) {
    return `
      <section class="card">
        <div class="tiny">Account</div>
        <div class="row" style="margin:8px 0 10px">
          <strong>Signed in</strong>
          <span class="sync-pill ${tone}" data-sync-pill>${esc(status)}</span>
        </div>
        <p class="disclaimer">${esc(cloud.user.email || 'Magic link session')}</p>
        <p class="muted">${esc(syncTime(cloud) || 'Backing up diary, goals, and workouts.')}</p>
        ${cloud.error ? `<p class="warn">${esc(cloud.error)}</p>` : ''}
        <button class="steel-btn" style="width:100%;margin-top:12px" data-act="sync-now">Sync now</button>
        <button class="text-btn" style="width:100%;margin-top:8px" data-act="sign-out">Sign out</button>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="tiny">Account</div>
      <div class="row" style="margin:8px 0 10px">
        <strong>Cloud backup</strong>
        <span class="sync-pill ${tone}" data-sync-pill>${esc(status)}</span>
      </div>
      <p class="disclaimer">Sign in with a magic link to sync diary and workouts across devices. Until then, this browser keeps an offline localStorage copy.</p>
      <form data-auth-form>
      <div class="field">
        <label for="auth-email">Email</label>
        <input id="auth-email" type="email" inputmode="email" autocomplete="email" data-keep="auth-email" data-act="auth-email" placeholder="you@email.com" value="${esc(ui.authEmail || '')}" />
      </div>
      <button class="primary-btn" type="submit">Email me a magic link</button>
      </form>
      ${cloud.error ? `<p class="warn" style="margin-top:12px">${esc(cloud.error)}</p>` : ''}
    </section>
  `;
}

export function renderMore(state, ui, cloud) {
  return `
    <section class="card more-hero">
      <div class="tiny">PepStep Guide &amp; Research</div>
      <h1>PepStep</h1>
      <p style="margin:0;font-weight:800;color:var(--navy)">Put a Pep in Your Step</p>
      <p class="motto">Longevity is Movement</p>
      <p class="muted">Family owned · Veteran owned</p>
    </section>

    ${renderAccount(cloud, ui)}
    ${renderInstallTip()}

    <section class="card">
      <div class="tiny">This app</div>
      <p class="disclaimer">PepStep here is <strong>Home + Diary + Workouts + More</strong> only. Peptide catalog, logbook, reminders, shop, and regimen tools are intentionally left out of this app.</p>
    </section>

    <section class="card">
      <div class="tiny">Links</div>
      <a class="link-out" href="https://pepstepguide.com" target="_blank" rel="noopener noreferrer">pepstepguide.com</a>
      <a class="link-out" href="mailto:support@pepstepguide.com">support@pepstepguide.com</a>
    </section>

    <section class="card">
      <div class="tiny">Not medical advice</div>
      <p class="disclaimer">The information in PepStep is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with questions about a medical condition or before starting a nutrition or training program. If you think you may have a medical emergency, call emergency services immediately.</p>
    </section>

    <section class="card">
      <div class="tiny">On this device</div>
      <p class="disclaimer">${
        cloud.user
          ? 'Signed-in data is stored in this browser and backed up to your PepStep account. Clearing data removes it here and in the cloud.'
          : 'Diary, goals, workouts, and plans are stored in this browser with localStorage until you sign in. Clearing site data will erase the offline copy.'
      }</p>
      <button class="danger" data-act="reset-data">${cloud.user ? 'Clear local &amp; cloud PepStep data' : 'Clear local PepStep data'}</button>
    </section>
  `;
}
