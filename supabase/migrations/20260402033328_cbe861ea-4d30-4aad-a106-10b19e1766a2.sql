
CREATE TABLE public.contact_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  url text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contact links viewable by everyone"
ON public.contact_links FOR SELECT USING (true);

CREATE POLICY "Admins manage contact links"
ON public.contact_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.contact_links (name, url) VALUES
  ('discord', 'https://discord.gg/6UpSEaSdj'),
  ('whatsapp', 'https://chat.whatsapp.com/D3zwwp30YY0CtVkCGmBzX3');
