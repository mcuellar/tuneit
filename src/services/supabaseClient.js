import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Update .env.local with your local anon key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
