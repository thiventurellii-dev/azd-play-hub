
ALTER TABLE public.mmr_ratings ALTER COLUMN current_mmr TYPE numeric(10,2) USING current_mmr::numeric(10,2);
ALTER TABLE public.mmr_ratings ALTER COLUMN current_mmr SET DEFAULT 1000;

ALTER TABLE public.match_results ALTER COLUMN mmr_before TYPE numeric(10,2) USING mmr_before::numeric(10,2);
ALTER TABLE public.match_results ALTER COLUMN mmr_before SET DEFAULT 1000;

ALTER TABLE public.match_results ALTER COLUMN mmr_change TYPE numeric(10,2) USING mmr_change::numeric(10,2);
ALTER TABLE public.match_results ALTER COLUMN mmr_change SET DEFAULT 0;

ALTER TABLE public.match_results ALTER COLUMN mmr_after TYPE numeric(10,2) USING mmr_after::numeric(10,2);
ALTER TABLE public.match_results ALTER COLUMN mmr_after SET DEFAULT 1000;
