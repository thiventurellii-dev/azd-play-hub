
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert suggestions"
  ON public.suggestions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view suggestions"
  ON public.suggestions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete suggestions"
  ON public.suggestions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
