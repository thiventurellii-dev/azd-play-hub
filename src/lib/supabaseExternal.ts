import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://npinawelxdtsrcvzzvvs.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waW5hd2VseGR0c3Jjdnp6dnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE0MTAsImV4cCI6MjA5MTE1NzQxMH0.S5xC9w11LiS1LuyAusr3vhxX-eR-yxXMcrGP0k8tAx0";

export const supabaseExternal = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY
);
