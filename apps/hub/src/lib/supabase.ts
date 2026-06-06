import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});

// Keep getSupabase() for backward compatibility — synchronous
export function getSupabase() { return supabase; }
export function getSupabaseClient()  { return supabase; }

export type SupabaseUser = {
  id: string;
  email: string;
  user_metadata: { full_name?: string; name?: string; avatar_url?: string };
  created_at: string;
};
