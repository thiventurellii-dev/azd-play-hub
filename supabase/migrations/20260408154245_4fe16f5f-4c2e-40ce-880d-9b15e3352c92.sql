CREATE TABLE public.account_disable_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_disable_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create disable requests"
  ON public.account_disable_requests FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view disable requests"
  ON public.account_disable_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins manage disable requests"
  ON public.account_disable_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));