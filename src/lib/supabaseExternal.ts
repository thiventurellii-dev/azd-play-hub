import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;

if (!EXTERNAL_SUPABASE_URL || !EXTERNAL_SUPABASE_ANON_KEY) {
  console.error("Missing VITE_EXTERNAL_SUPABASE_URL or VITE_EXTERNAL_SUPABASE_ANON_KEY env vars");
}

export const supabaseExternal = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY
);

// Re-export as "supabase" so all existing imports work after path change
export const supabase = supabaseExternal;
