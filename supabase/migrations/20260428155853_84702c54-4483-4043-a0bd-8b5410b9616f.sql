
-- Add regulation_url to seasons
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS regulation_url text;

-- Create storage bucket for season regulations
INSERT INTO storage.buckets (id, name, public)
VALUES ('season-regulations', 'season-regulations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Season regulations viewable by everyone" ON storage.objects;
CREATE POLICY "Season regulations viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'season-regulations');

DROP POLICY IF EXISTS "Admins can upload season regulations" ON storage.objects;
CREATE POLICY "Admins can upload season regulations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'season-regulations' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update season regulations" ON storage.objects;
CREATE POLICY "Admins can update season regulations"
ON storage.objects FOR UPDATE
USING (bucket_id = 'season-regulations' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete season regulations" ON storage.objects;
CREATE POLICY "Admins can delete season regulations"
ON storage.objects FOR DELETE
USING (bucket_id = 'season-regulations' AND has_role(auth.uid(), 'admin'::app_role));

-- Drop community documents table (no longer needed; replaced by per-season regulations)
DROP TABLE IF EXISTS public.community_documents;
