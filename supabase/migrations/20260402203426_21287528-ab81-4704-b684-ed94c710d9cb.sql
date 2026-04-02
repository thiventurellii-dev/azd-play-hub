
ALTER TABLE public.suggestions
  ADD COLUMN priority text NOT NULL DEFAULT 'media',
  ADD COLUMN complexity text NOT NULL DEFAULT 'medio',
  ADD COLUMN status text NOT NULL DEFAULT 'pending';

CREATE POLICY "Admins can update suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
