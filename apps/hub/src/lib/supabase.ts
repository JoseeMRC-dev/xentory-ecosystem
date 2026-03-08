import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtgatdmrpfysqphdgaue.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});

// Keep getSupabase() for backward compatibility — now returns synchronously
export async function getSupabase() { return supabase; }
export function getSupabaseClient()  { return supabase; }

export type SupabaseUser = {
  id: string;
  email: string;
  user_metadata: { full_name?: string; name?: string; avatar_url?: string };
  created_at: string;
};
