import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Account role constants — single source of truth for role groupings.
 * When adding a new account_type, update these arrays and verify all
 * consumers (SubscriptionGate, route guards, Edge Function allow/deny
 * lists) still make sense.
 */
export const CORPORATE_ROLES = [
  "corporate_employee",
  "company_admin",
  "org_admin",
] as const;

export const BYPASS_ROLES = [
  "brainwise_super_admin",
  "coach",
] as const;

export type CorporateRole = (typeof CORPORATE_ROLES)[number];
export type BypassRole = (typeof BYPASS_ROLES)[number];

export interface AccountRoleInfo {
  accountType: string | null;
  isCorp: boolean;
  isIndividual: boolean;
  isCoach: boolean;
  isSuperAdmin: boolean;
  isBypassAdmin: boolean;
  isCompanyAdmin: boolean;
  isOrgAdmin: boolean;
  loading: boolean;
}

/**
 * Derives role booleans from the current user's profile.
 * Use this hook everywhere role-based branching is needed.
 *
 * - isCorp: any corporate role (employee or admin).
 * - isBypassAdmin: super admin or coach; skips Stripe subscription gating.
 * - While loading, all booleans are false. Consumers should check `loading`
 *   before rendering gated content.
 */
export function useAccountRole(): AccountRoleInfo {
  const { profile, loading } = useUserProfile();
  const accountType = profile?.account_type ?? null;

  if (loading || !accountType) {
    return {
      accountType,
      isCorp: false,
      isIndividual: false,
      isCoach: false,
      isSuperAdmin: false,
      isBypassAdmin: false,
      isCompanyAdmin: false,
      isOrgAdmin: false,
      loading,
    };
  }

  const isCorp = (CORPORATE_ROLES as readonly string[]).includes(accountType);
  const isBypassAdmin = (BYPASS_ROLES as readonly string[]).includes(accountType);

  return {
    accountType,
    isCorp,
    isIndividual: accountType === "individual",
    isCoach: accountType === "coach",
    isSuperAdmin: accountType === "brainwise_super_admin",
    isBypassAdmin,
    isCompanyAdmin: accountType === "company_admin",
    isOrgAdmin: accountType === "org_admin",
    loading,
  };
}
