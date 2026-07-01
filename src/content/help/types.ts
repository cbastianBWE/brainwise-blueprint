export type HelpRole =
  | "individual"
  | "coach_client"
  | "coach"
  | "mentor"
  | "org_member"
  | "org_admin"
  | "super_admin";

export interface HelpStep {
  title: string;
  body: string;
  /** CDN URL from a .asset.json file; omit if no screenshot yet. */
  imageUrl?: string;
  imageAlt?: string;
}

export interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
}

export interface HelpRoleContent {
  role: HelpRole;
  label: string;
  description: string;
  guides: HelpGuide[];
}
