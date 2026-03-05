/**
 * Supabase client con import dinámico.
 * No crashea aunque @supabase/supabase-js no esté instalado.
 * Cuando lo instales (npm install @supabase/supabase-js) funciona automáticamente.
 */

const SUPABASE_URL = 'https://mtgatdmrpfysqphdgaue.supabase.co';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z2F0ZG1ycGZ5c3FwaGRnYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjA5NjksImV4cCI6MjA4ODE5Njk2OX0.yx_ciyMPr0iiurbIBc8GuhL4gEXkaSjYKTevWqUrPpY';

let _client: any = null;

export async function getSupabase(): Promise<any | null> {
  if (_client) return _client;
  try {
    const { createClient } = await import('@supabase/supabase-js' as any);
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        flowType:           'pkce',
        detectSessionInUrl: true,
      },
    });
    return _client;
  } catch {
    // paquete no instalado → modo mock, la app sigue funcionando
    return null;
  }
}

// alias síncrono por si algo lo llama sin await
export function getSupabaseClient() { return _client; }

export type SupabaseUser = {
  id: string;
  email: string;
  user_metadata: { full_name?: string; name?: string; avatar_url?: string };
  created_at: string;
};
