
-- Fix 1: Restrict assessment_results org permission scope to admin/super_admin only
DROP POLICY IF EXISTS "assessment_results: permission-gated org access" ON public.assessment_results;

CREATE POLICY "assessment_results: permission-gated org access"
ON public.assessment_results
FOR SELECT
TO authenticated
USING (
  current_user_account_type() IN ('admin', 'brainwise_super_admin')
  AND EXISTS (
    SELECT 1 FROM permissions p
    WHERE p.owner_user_id = assessment_results.user_id
      AND p.viewer_organization_id = current_user_org_id()
      AND (p.expires_at IS NULL OR p.expires_at > now())
  )
);

-- Fix 2: Create security definer function to avoid recursive subqueries in users UPDATE policy
CREATE OR REPLACE FUNCTION public.get_own_immutable_fields()
RETURNS TABLE (
  email TEXT,
  account_type TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, u.account_type, u.subscription_tier,
         u.subscription_status, u.organization_id, u.created_at
  FROM users u
  WHERE u.id = auth.uid();
$$;

-- Drop and recreate the users UPDATE policy using the new function
DROP POLICY IF EXISTS "users: update own safe fields" ON public.users;

CREATE POLICY "users: update own safe fields"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND email               = (SELECT email FROM public.get_own_immutable_fields())
  AND subscription_tier   = (SELECT subscription_tier FROM public.get_own_immutable_fields())
  AND subscription_status = (SELECT subscription_status FROM public.get_own_immutable_fields())
  AND organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM public.get_own_immutable_fields())
  AND created_at          = (SELECT created_at FROM public.get_own_immutable_fields())
);
