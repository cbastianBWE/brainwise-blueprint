import type { HelpRoleContent } from "./types";
import { individualContent } from "./individual";
import { coachContent } from "./coach";
import { orgMemberContent } from "./org_member";
import { orgAdminContent } from "./org_admin";

const placeholder = (
  role: HelpRoleContent["role"],
  label: string,
  description: string,
): HelpRoleContent => ({
  role,
  label,
  description,
  guides: [],
});

export const helpContent: Record<HelpRoleContent["role"], HelpRoleContent> = {
  individual: individualContent,
  coach: coachContent,
  org_member: orgMemberContent,
  org_admin: orgAdminContent,
  mentor: placeholder(
    "mentor",
    "Mentor",
    "You mentor coaches-in-training. Guides for reviewing trainees, leaving feedback, and using templates are on the way.",
  ),
  super_admin: placeholder(
    "super_admin",
    "Super Admin",
    "You administer the platform. Guides for organization setup, coach tracking, impersonation, trusted devices, and platform features are on the way.",
  ),
  // Coach clients follow the same flow as Individuals — we intentionally
  // don't surface a separate tab. Kept in the map so the type stays exhaustive.
  coach_client: placeholder(
    "coach_client",
    "Coach Client",
    "Coach clients use the same flows as individual users — see the Individual tab.",
  ),
};

export const helpRoleOrder: HelpRoleContent["role"][] = [
  "individual",
  "org_member",
  "coach",
  "mentor",
  "org_admin",
  "super_admin",
];
