import { readFileSync } from 'node:fs';
import { DELETE_ACCOUNT_NOT_INSTALLED, isDeleteAccountMissing } from '../src/cloud/deleteAccountError.js';
import { isPrivacyPath, privacyHref, renderPrivacy, PRIVACY_PUBLIC_URL } from '../src/privacy.js';
import { renderMore } from '../src/views/more.js';
import { defaultState } from '../src/storage.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isPrivacyPath('/privacy'), '/privacy is the public privacy route');
assert(isPrivacyPath('/privacy/'), 'a trailing slash still counts as /privacy');
assert(!isPrivacyPath('/'), 'home is not the privacy route');
assert(!isPrivacyPath('/privacy-policy'), 'only the /privacy path is public');
assert(privacyHref(false) === '/privacy', 'the website link stays on this origin');
assert(privacyHref(true) === PRIVACY_PUBLIC_URL, 'the iOS link opens the live privacy page');

const page = renderPrivacy({ fromApp: false });
for (const phrase of [
  'Privacy policy',
  'October 6, 2026',
  'family-owned and veteran-owned',
  'support@pepstepguide.com',
  'magic link',
  'Supabase',
  'Vercel',
  'does not sell',
  'does not use your information for advertising',
  'not shared with third parties',
  'not used for marketing',
  'Delete account',
  'Apple Health',
  'stays on the iPhone',
  'children under 13',
  'does not provide medical advice',
]) {
  assert(page.includes(phrase), `privacy page should mention: ${phrase}`);
}
assert(page.includes('data-privacy-page'), 'privacy page is marked for the public route');
assert(!page.includes('service_role'), 'privacy page does not mention a service role key');

const signedOut = renderMore(
  defaultState(),
  { authEmail: '' },
  { configured: true, status: 'offline', user: null },
  { privacyHref: '/privacy' }
);
assert(signedOut.includes('Privacy policy'), 'sign-in screen links to the privacy policy');
assert(signedOut.includes('href="/privacy"'), 'signed-out More tab links to /privacy');
assert(!signedOut.includes('data-delete-account'), 'Delete account is hidden until sign-in');
assert(!signedOut.includes('>Delete account<'), 'the delete label is not shown when signed out');

const signedIn = renderMore(
  defaultState(),
  { authEmail: '' },
  { configured: true, status: 'synced', user: { id: 'user-1', email: 'you@example.com' } },
  { privacyHref: '/privacy' }
);
assert(signedIn.includes('data-delete-account'), 'signed-in More tab has Delete account');
assert(signedIn.includes('>Delete account<'), 'the control is labeled Delete account');
assert(signedIn.includes('Privacy policy'), 'signed-in More tab still links to the privacy policy');
assert(signedIn.includes('you@example.com'), 'signed-in account shows the email');

const notice = renderMore(
  defaultState(),
  { authEmail: '', accountNotice: 'Your PepStep account was deleted.' },
  { configured: true, status: 'offline', user: null }
);
assert(notice.includes('data-account-notice'), 'signed-out state can show the deletion confirmation');
assert(notice.includes('Your PepStep account was deleted.'), 'confirmation copy is visible');

assert(
  isDeleteAccountMissing({ code: 'PGRST202', message: 'Could not find the function public.delete_own_account' }),
  'a missing RPC is recognized'
);
assert(
  isDeleteAccountMissing({ message: 'function public.delete_own_account() does not exist', code: '42883' }),
  'a missing database function is recognized'
);
assert(!isDeleteAccountMissing({ code: '42501', message: 'permission denied for table users' }), 'other failures stay visible');
assert(DELETE_ACCOUNT_NOT_INSTALLED.includes('002_delete_account.sql'), 'the missing-function error tells you which SQL to run');
assert(DELETE_ACCOUNT_NOT_INSTALLED.includes('not installed'), 'the error says the server piece is missing');

const sql = readFileSync(new URL('../supabase/migrations/002_delete_account.sql', import.meta.url), 'utf8');
for (const phrase of [
  'delete_own_account',
  'security definer',
  'auth.uid()',
  'auth.users',
  'public.profiles',
  'public.diary_days',
  'public.custom_foods',
  'public.workout_sessions',
  'public.workout_plans',
  'grant execute on function public.delete_own_account() to authenticated',
  'revoke all on function public.delete_own_account() from anon',
]) {
  assert(sql.includes(phrase), `migration should include: ${phrase}`);
}
assert(!/service_role\s*=\s*['"][^'"]+['"]/i.test(sql), 'the migration does not embed a service role key');

console.log('delete account and privacy checks ok');
