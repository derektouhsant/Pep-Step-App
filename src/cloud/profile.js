export function isMissingOnboardingColumn(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  if (!message.includes('onboarding')) return false;
  if (code === 'PGRST204' || code === '42703') return true;
  return message.includes('column') || message.includes('schema cache');
}

export function profileWriteRow(userId, state, now) {
  const row = {
    user_id: userId,
    goals: state?.goals || {},
    last_sets: state?.lastSets || {},
    updated_at: now,
  };
  if (state?.onboarding) row.onboarding = state.onboarding;
  return row;
}

export async function loadProfile(supabase, userId) {
  const first = await supabase
    .from('profiles')
    .select('goals,last_sets,onboarding,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (first.error && isMissingOnboardingColumn(first.error)) {
    const second = await supabase
      .from('profiles')
      .select('goals,last_sets,updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (second.error) throw new Error(second.error.message || 'Could not load profile');
    return second.data || null;
  }
  if (first.error) throw new Error(first.error.message || 'Could not load profile');
  return first.data || null;
}

export async function saveProfile(supabase, userId, state, now) {
  const row = profileWriteRow(userId, state, now);
  let { error } = await supabase.from('profiles').upsert(row);
  if (error && row.onboarding && isMissingOnboardingColumn(error)) {
    const legacy = { ...row };
    delete legacy.onboarding;
    ({ error } = await supabase.from('profiles').upsert(legacy));
  }
  if (error) throw new Error(error.message || 'Could not save goals');
}
