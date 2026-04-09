
-- Drop the existing permissive UPDATE policy for own row
DROP POLICY "users: update own row restricted" ON public.users;

-- Create a replacement that only allows changes to full_name and onboarding_instrument_version
CREATE POLICY "users: update own safe fields"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  AND created_at = (SELECT u.created_at FROM public.users u WHERE u.id = auth.uid())
  AND account_type IS NOT DISTINCT FROM (SELECT u.account_type FROM public.users u WHERE u.id = auth.uid())
  AND subscription_tier = (SELECT u.subscription_tier FROM public.users u WHERE u.id = auth.uid())
  AND subscription_status = (SELECT u.subscription_status FROM public.users u WHERE u.id = auth.uid())
  AND organization_id IS NOT DISTINCT FROM (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
);
