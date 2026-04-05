
-- Add approval status to matches for competitive approval workflow
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
