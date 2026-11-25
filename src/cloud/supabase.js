import { createClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export function isCloudConfigured() {
  return Boolean(url && anonKey);
}

let client;

export function getSupabase() {
  if (!isCloudConfigured()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
