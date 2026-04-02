CREATE TABLE public.about_us (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.about_us ENABLE ROW LEVEL SECURITY;

CREATE POLICY "About us viewable by everyone"
ON public.about_us FOR SELECT
USING (true);

CREATE POLICY "Admins manage about us"
ON public.about_us FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.about_us (content) VALUES ('A **Amizade (AzD)** é uma comunidade apaixonada por board games. Reunimos amigos em torno da mesa para competições emocionantes, seasons com premiações e muita diversão.

Nossa missão é fortalecer laços de amizade através de jogos de tabuleiro modernos, promovendo competições saudáveis com rankings, MMR e premiações.

Junte-se a nós e faça parte dessa comunidade incrível!');
