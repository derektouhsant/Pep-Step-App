-- Delete the signed-in user's PepStep data and their auth user.
-- Apple App Store guideline 5.1.1(v): apps that create accounts must let
-- the user delete the account from inside the app.
--
-- The anon key cannot delete auth.users. This SECURITY DEFINER function
-- deletes only auth.uid() — it cannot target any other user.
-- Public PepStep rows also reference auth.users ON DELETE CASCADE.
-- They are deleted explicitly first so synced data is removed even if a
-- later auth-schema change stops the cascade.
--
-- Apply this in the Supabase dashboard (it is not applied automatically):
--   1. Open the project → SQL Editor → New query.
--   2. Paste this entire file and run it.
--   3. Confirm Database → Functions lists delete_own_account.
--
-- If the run fails with "permission denied for table users":
--   The SQL editor role on that project cannot delete auth.users.
--   Deploy supabase/functions/delete-account instead (see the README).
--   The app tries this function first, then the Edge Function.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.diary_days where user_id = uid;
  delete from public.custom_foods where user_id = uid;
  delete from public.workout_sessions where user_id = uid;
  delete from public.workout_plans where user_id = uid;
  delete from public.profiles where user_id = uid;

  delete from auth.users where id = uid;
  if not found then
    raise exception 'Could not delete the auth user';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes PepStep rows and the auth.users row for auth.uid() only.';
