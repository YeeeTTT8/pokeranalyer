// Supabase configuration comes from build-time env (Vite). When both values are
// present the app runs in synced mode; otherwise it falls back to localStorage
// (this is what keeps the Artifact demo and any un-configured build working).

// import.meta.env exists under Vite; guard so this module is also importable in
// plain Node (used by the test suite).
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const SUPABASE_URL = ENV.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Storage keys (also used by the localStorage repo and the migration importer).
export const LS_SESSIONS = 'pa_sessions';
export const LS_HANDS = 'pa_hands';
// Marks that a localStorage -> Supabase import already ran for a given user, so
// we never double-import.
export const LS_MIGRATED_PREFIX = 'pa_migrated_';
// Remembers an explicit "use this device only" choice.
export const LS_LOCAL_ONLY = 'pa_local_only';
