import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only client using the service role key — bypasses RLS (every table in this
// project has RLS enabled with zero policies, so the service role key is the only
// way to read/write). Never import this from a client component.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
