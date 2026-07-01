import type { HelpRoleContent } from "./types";
import { individualContent } from "./individual";

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
  coach_client: placeholder(
    "coach_client",
    "Coach Client",
    "You were invited into the platform by a coach. Guides for accepting the invite, taking your assigned assessment, and understanding what your coach can see are on the way.",
  ),
  coach: placeholder(
    "coach",
    "Coach",
    "You use BrainWise with your own coaching clients. Guides for inviting clients, ordering assessments, reviewing results, and sharing reports are on the way.",
  ),
  mentor: placeholder(
    "mentor",
    "Mentor",
    "You mentor coaches-in-training. Guides for reviewing trainees, leaving feedback, and using templates are on the way.",
  ),
  org_member: placeholder(
    "org_member",
    "Org Member",
    "Your organization gave you access. Guides for accepting the invite, completing your assigned assessment, and viewing your results are on the way.",
  ),
  org_admin: placeholder(
    "org_admin",
    "Org / Company Admin",
    "You administer an organization on BrainWise. Guides for inviting members (single and bulk), picking assessments, reviewing completion, and sharing resources are on the way.",
  ),
  super_admin: placeholder(
    "super_admin",
    "Super Admin",
    "You administer the platform. Guides for organization setup, coach tracking, impersonation, trusted devices, and platform features are on the way.",
  ),
};

export const helpRoleOrder: HelpRoleContent["role"][] = [
  "individual",
  "coach_client",
  "org_member",
  "coach",
  "mentor",
  "org_admin",
  "super_admin",
];
