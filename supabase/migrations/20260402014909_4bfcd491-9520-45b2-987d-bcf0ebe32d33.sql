
-- Add prize columns to seasons
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS prize_1st integer DEFAULT 0;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS prize_2nd integer DEFAULT 0;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS prize_3rd integer DEFAULT 0;

-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update existing profiles to 'active' (they already completed signup)
UPDATE public.profiles SET status = 'active' WHERE status = 'pending' AND nickname IS NOT NULL AND nickname != '' AND name IS NOT NULL AND name != '';
