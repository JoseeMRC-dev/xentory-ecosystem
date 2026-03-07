import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtgatdmrpfysqphdgaue.supabase.co';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z2F0ZG1ycGZ5c3FwaGRnYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjA5NjksImV4cCI6MjA4ODE5Njk2OX0.yx_ciyMPr0iiurbIBc8GuhL4gEXkaSjYKTevWqUrPpY';

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
