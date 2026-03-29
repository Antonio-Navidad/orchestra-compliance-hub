-- ── Orchestra AI: Credits & Subscription Plans ──────────────────────────────
-- Adds per-user validation credits (free tier = 5) and maps subscription
-- tiers to plan names for the $299/month Starter and $499/month Team plans.
--
-- To apply: run this in Supabase Dashboard → SQL Editor, or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add credits_remaining column to profiles (default 5 free credits)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 5;

-- 2. Add a plan_name column to make subscription tiers human-readable
--    Maps: free → "Free", gold → "Starter ($299/mo)", black → "Team ($499/mo)"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_name TEXT NOT NULL DEFAULT 'Free';

-- 3. Add the Stripe subscription ID for webhook reconciliation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 4. Add subscription period end timestamp so we can enforce expiry
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- 5. Ensure existing free-tier users start with 5 credits
UPDATE public.profiles
  SET credits_remaining = 5
  WHERE subscription_tier = 'free'
    AND credits_remaining IS NULL;

-- 6. Ensure existing paid subscribers have unlimited credits (represented as 999999)
UPDATE public.profiles
  SET credits_remaining = 999999,
      plan_name = CASE
        WHEN subscription_tier = 'gold'  THEN 'Starter'
        WHEN subscription_tier = 'black' THEN 'Team'
        ELSE 'Free'
      END
  WHERE subscription_tier IN ('gold', 'black');

-- 7. Function to safely deduct one credit (returns false if no credits left)
CREATE OR REPLACE FUNCTION public.deduct_validation_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits INTEGER;
  v_tier    TEXT;
BEGIN
  SELECT credits_remaining, subscription_tier
    INTO v_credits, v_tier
    FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  -- Subscribers on paid plans (gold/black) are never blocked
  IF v_tier IN ('gold', 'black') THEN
    RETURN TRUE;
  END IF;

  IF v_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
     SET credits_remaining = credits_remaining - 1
   WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 8. RLS: users can only read/update their own profile row (already exists, but ensure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END;
$$;
