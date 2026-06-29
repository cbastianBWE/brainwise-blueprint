export interface MemberRow {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
  organization_name: string | null;
  is_mentor: boolean;
  active_assignment_count: number;
  certification_count: number;
  worst_certification_status: string | null;
  account_status: string;
  last_sign_in_at: string | null;
  show_coach_tab: boolean;
  is_coach_actor?: boolean | null;
  is_coach_client?: boolean | null;
  total_count: number;
}

export interface MembersFilterState {
  account_types: string[] | null;
  is_mentor: boolean | null;
  account_status_in: string[] | null;
  has_active_assignments: boolean | null;
  organization_ids: string[] | null;
  certification_statuses: string[] | null;
  last_active_within_days: number | null;
  created_within_days: number | null;
  has_supervisor: boolean | null;
  is_coach_actor: boolean | null;
  is_coach_client: boolean | null;
}

export interface MembersSortState {
  column:
    | "name"
    | "email"
    | "account_type"
    | "organization"
    | "account_status"
    | "worst_certification_status"
    | "active_assignments"
    | "certification_count"
    | "last_login";
  direction: "asc" | "desc";
}

export interface SavedView {
  id: string;
  name: string;
  filters: MembersFilterState;
  sort: MembersSortState;
  columns: string[];
}

export interface MembersUiPreferences {
  version: 1;
  default_view: string | null;
  saved_views: SavedView[];
}

export const MEMBER_COLUMN_IDS = [
  "name",
  "email",
  "account_type",
  "mentor",
  "organization",
  "active_assignments",
  "certifications",
  "status",
  "last_login",
  "last_assessment",
  "relationship",
  "actions",
] as const;

export type MemberColumnId = (typeof MEMBER_COLUMN_IDS)[number];

export const SYSTEM_DEFAULT_COLUMNS: MemberColumnId[] = [
  "name",
  "email",
  "account_type",
  "mentor",
  "organization",
  "active_assignments",
  "certifications",
  "status",
  "last_login",
  "last_assessment",
  "actions",
];

export const SYSTEM_DEFAULT_FILTERS: MembersFilterState = {
  account_types: null,
  is_mentor: null,
  account_status_in: ["active"],
  has_active_assignments: null,
  organization_ids: null,
  certification_statuses: null,
  last_active_within_days: null,
  created_within_days: null,
  has_supervisor: null,
  is_coach_actor: null,
  is_coach_client: null,
};

export const SYSTEM_DEFAULT_SORT: MembersSortState = {
  column: "name",
  direction: "asc",
};
