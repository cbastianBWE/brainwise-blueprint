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
  /**
   * True only for super admin. Use this on the assessment-take surface
   * (InstrumentSelection) where coaches MUST be gated like base-tier
   * individuals. Distinct from isBypassAdmin, which also covers coaches
   * for AI chat / resources surfaces.
   */
  canBypassAssessmentPaywall: boolean;
  isCompanyAdmin: boolean;
  isOrgAdmin: boolean;
  loading: boolean;
}

/**
 * Derives role booleans from the current user's profile.
 * Use this hook everywhere role-based branching is needed.
 *
 * - isCorp: any corporate role (employee or admin).
 * - isBypassAdmin: super admin or coach; skips Stripe subscription gating
 *   on AI chat / resources / results surfaces.
 * - canBypassAssessmentPaywall: super admin only; skips the assessment-take
 *   paywall in InstrumentSelection. Coaches are explicitly NOT included so
 *   they're gated like base-tier individuals when taking assessments.
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
      canBypassAssessmentPaywall: false,
      isCompanyAdmin: false,
      isOrgAdmin: false,
      loading,
    };
  }

  const isCorp = (CORPORATE_ROLES as readonly string[]).includes(accountType);
  const isBypassAdmin = (BYPASS_ROLES as readonly string[]).includes(accountType);
  const isSuperAdmin = accountType === "brainwise_super_admin";

  return {
    accountType,
    isCorp,
    isIndividual: accountType === "individual",
    isCoach: accountType === "coach",
    isSuperAdmin,
    isBypassAdmin,
    canBypassAssessmentPaywall: isSuperAdmin,
    isCompanyAdmin: accountType === "company_admin",
    isOrgAdmin: accountType === "org_admin",
    loading,
  };
}
