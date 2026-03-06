import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtgatdmrpfysqphdgaue.supabase.co';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z2F0ZG1ycGZ5c3FwaGRnYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjA5NjksImV4cCI6MjA4ODE5Njk2OX0.yx_ciyMPr0iiurbIBc8GuhL4gEXkaSjYKTevWqUrPpY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,
  },
});
