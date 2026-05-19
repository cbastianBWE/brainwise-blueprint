// Shared search-row primitives used by both MentorRoleTab and
// CompletionControlTab inside LearningAdmin. Lifted out of LearningAdmin.tsx
// so both tabs reference one source of truth.

export interface SearchRow {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
  organization_name: string | null;
  total_count: number;
}

export const PAGE_SIZE = 25;

export const formatAccountType = (t: string | null): string => {
  if (!t) return "Unknown";
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export const accountTypeBadgeVariant = (
  t: string | null,
): "default" | "secondary" | "destructive" | "outline" => {
  if (!t) return "outline";
  switch (t) {
    case "brainwise_super_admin":
      return "destructive";
    case "org_admin":
    case "company_admin":
      return "default";
    case "coach":
      return "secondary";
    default:
      return "outline";
  }
};
