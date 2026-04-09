
-- 1. Drop the overly broad update policy
DROP POLICY IF EXISTS "users: update own row" ON public.users;

-- 2. Create a replacement policy scoped to own row
--    (column-level enforcement is done by the trigger below)
CREATE POLICY "users: update own row restricted"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Replace the trigger function to allow full_name and onboarding_instrument_version,
--    but forcibly reset all sensitive columns
CREATE OR REPLACE FUNCTION public.enforce_immutable_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_account_type TEXT;
    caller_org_id       UUID;
BEGIN
    -- service_role bypasses all restrictions
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch the calling user's account_type and org
    SELECT account_type, organization_id
    INTO caller_account_type, caller_org_id
    FROM users
    WHERE id = auth.uid();

    -- Always reset these fields to OLD values for non-service callers
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_tier   := OLD.subscription_tier;
    NEW.organization_id     := OLD.organization_id;
    NEW.email               := OLD.email;
    NEW.created_at          := OLD.created_at;

    -- account_type: only super admins or org admins (for their own org) can change it
    IF caller_account_type = 'brainwise_super_admin' THEN
        NULL; -- allowed
    ELSIF caller_account_type = 'admin'
          AND OLD.organization_id = caller_org_id THEN
        NULL; -- org admin may change for their org members
    ELSE
        NEW.account_type := OLD.account_type;
    END IF;

    -- full_name and onboarding_instrument_version are freely editable by the user
    RETURN NEW;
END;
$$;

-- 4. Attach the trigger (drop first if it somehow exists)
DROP TRIGGER IF EXISTS enforce_immutable_user_fields ON public.users;

CREATE TRIGGER enforce_immutable_user_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_immutable_user_fields();
