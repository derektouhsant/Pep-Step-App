export const DELETE_ACCOUNT_NOT_INSTALLED =
  'Account deletion is not available yet. The Supabase function delete_own_account is not installed. In the Supabase dashboard, open SQL Editor, paste and run supabase/migrations/002_delete_account.sql, then try again.';

export function isDeleteAccountMissing(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  if (code === 'PGRST202' || code === '42883') return true;
  if (/could not find the function/i.test(message) || /schema cache/i.test(message)) return true;
  return /delete_own_account/i.test(message) && /does not exist|not found|undefined function/i.test(message);
}
