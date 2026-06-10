-- Add leave balance columns to profiles
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS sick_balance integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS casual_balance integer NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS annual_balance integer NOT NULL DEFAULT 14;

-- Optional: keep legacy compatibility by ensuring columns exist with defaults
COMMENT ON COLUMN public.profiles.sick_balance IS 'Remaining sick leave days';
COMMENT ON COLUMN public.profiles.casual_balance IS 'Remaining casual leave days';
COMMENT ON COLUMN public.profiles.annual_balance IS 'Remaining annual leave days';
