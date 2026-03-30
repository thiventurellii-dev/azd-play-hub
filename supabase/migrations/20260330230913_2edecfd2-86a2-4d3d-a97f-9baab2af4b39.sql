
-- Add image_url to matches table
ALTER TABLE matches ADD COLUMN image_url text;

-- Create storage bucket for match images
INSERT INTO storage.buckets (id, name, public) VALUES ('match-images', 'match-images', true);

-- Allow authenticated users to upload match images
CREATE POLICY "Admins upload match images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'match-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view match images
CREATE POLICY "Anyone can view match images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'match-images');

-- Admins can delete match images
CREATE POLICY "Admins delete match images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'match-images' AND public.has_role(auth.uid(), 'admin'::app_role));
