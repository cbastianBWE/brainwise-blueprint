CREATE POLICY "ai_versions: super admin can read"
ON public.ai_versions
FOR SELECT
TO authenticated
USING (public.current_user_account_type() = 'brainwise_super_admin');