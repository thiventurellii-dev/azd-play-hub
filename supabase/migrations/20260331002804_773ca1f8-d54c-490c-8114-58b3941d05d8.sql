
-- Create a public bucket for community documents
INSERT INTO storage.buckets (id, name, public) VALUES ('community-docs', 'community-docs', true);

-- Allow public read
CREATE POLICY "Public read community docs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'community-docs');

-- Allow admins to upload
CREATE POLICY "Admins upload community docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-docs' AND public.has_role(auth.uid(), 'admin'));
