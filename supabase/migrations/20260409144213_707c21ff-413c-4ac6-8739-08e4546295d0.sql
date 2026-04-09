ALTER TABLE public.match_rooms
  ADD COLUMN result_id uuid DEFAULT NULL,
  ADD COLUMN result_type text DEFAULT NULL;