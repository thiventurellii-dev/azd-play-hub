-- =====================================================================
-- Achievements v2 — Replace community stats TABLE with a VIEW.
-- Apply manually in the EXTERNAL Supabase SQL Editor (npinawelxdtsrcvzzvvs).
--
-- Rationale: at AzD scale, the cached aggregation is overengineered.
-- A plain view that recalculates on read is fast enough and gives
-- real-time data — no pg_cron, no pg_net, no edge function needed.
-- =====================================================================

-- Drop the table (and its policies/indexes) created by the previous migration.
DROP TABLE IF EXISTS public.achievement_community_stats CASCADE;

-- Recreate as a view with the same column names so the frontend keeps working.
CREATE OR REPLACE VIEW public.achievement_community_stats AS
SELECT
  pa.achievement_template_id,
  pa.scope_type,
  pa.scope_id,
  COUNT(DISTINCT pa.player_profile_id)::int AS unlocked_count,
  (SELECT COUNT(*)::int FROM public.profiles) AS total_eligible_players,
  ROUND(
    COUNT(DISTINCT pa.player_profile_id)::numeric
    / NULLIF((SELECT COUNT(*) FROM public.profiles), 0)
    * 100,
    1
  ) AS community_percentage,
  now() AS last_calculated_at
FROM public.player_achievements pa
WHERE pa.status = 'approved'
GROUP BY pa.achievement_template_id, pa.scope_type, pa.scope_id;

-- Views inherit RLS from underlying tables; player_achievements already
-- allows public SELECT, so the view is publicly readable as expected.

COMMENT ON VIEW public.achievement_community_stats IS
  'Real-time aggregation of achievement unlocks. Replaces the cached table.';
