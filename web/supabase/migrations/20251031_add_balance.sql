-- Add lamport-based balance to user profile
ALTER TABLE public.profile
ADD COLUMN IF NOT EXISTS balance_lamports BIGINT NOT NULL DEFAULT 0;

-- Optional: index for frequent updates/lookups
CREATE INDEX IF NOT EXISTS idx_profile_balance_lamports ON public.profile (balance_lamports);
