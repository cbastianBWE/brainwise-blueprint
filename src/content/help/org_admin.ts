import type { HelpRoleContent } from "./types";
import dashboard from "@/assets/help/org_admin/10_dashboard.png.asset.json";
import invite from "@/assets/help/org_admin/20_users_invite.png.asset.json";
import usersList from "@/assets/help/org_admin/21_users_list.png.asset.json";
import pendingInvites from "@/assets/help/org_admin/22_pending_invitations.png.asset.json";
import teamPaired from "@/assets/help/org_admin/30_team_paired.png.asset.json";
import adminResources from "@/assets/help/org_admin/35_admin_resources.png.asset.json";
import features from "@/assets/help/org_admin/40_features.png.asset.json";
import featuresOverrides from "@/assets/help/org_admin/41_features_overrides.png.asset.json";
import interventions from "@/assets/help/org_admin/60_interventions.png.asset.json";
import adminSettings from "@/assets/help/org_admin/80_settings.png.asset.json";

export const orgAdminContent: HelpRoleContent = {
  role: "org_admin",
  label: "Org / Company Admin",
  description:
    "You administer your organization on BrainWise — inviting members, choosing which assessments they take, generating team reports, and configuring features. Company Admins see the same surfaces as Org Admins.",
  guides: [
    {
      id: "invite-one-member",
      title: "Invite a single member",
      summary: "Send one invitation and pick which assessment they'll complete first.",
      steps: [
        {
          title: "Open Users",
          body:
            "Click Users in the sidebar. You'll land on the Invite tab by default.",
          imageUrl: dashboard.url,
          imageAlt: "Org admin dashboard sidebar",
          hotspots: [
            { x: 1.2, y: 18.0, w: 18.3, h: 1.9, label: "Click Users" },
          ],
        },
        {
          title: "Fill in the invite form",
          body:
            "Enter the invitee's email and department (both required). Optionally add their supervisor's email and org level — you'll need the supervisor email if you want the person included in dual-rater assessments like AIRSA.",
          imageUrl: invite.url,
          imageAlt: "Invite a user form",
          hotspots: [
            { x: 25.7, y: 21.5, w: 33.6, h: 1.6, label: "Email (required)" },
            { x: 60.5, y: 21.5, w: 33.5, h: 1.6, label: "Department (required)" },
          ],
        },
        {
          title: "Pick the assessment",
          body:
            "Use the Assessment dropdown to choose which assessment this person must complete first. Defaults to PTP; only assessments your organization has purchased will appear. The invitee lands directly on that assessment after they accept.",
          imageUrl: invite.url,
          imageAlt: "Assessment picker on the invite form",
          hotspots: [
            { x: 25.7, y: 31.0, w: 33.6, h: 1.7, label: "Choose the assessment" },
            { x: 83.0, y: 34.0, w: 12.0, h: 2.0, label: "Send invitation" },
          ],
        },
      ],
    },
    {
      id: "bulk-invite",
      title: "Bulk invite from a CSV",
      summary: "Invite dozens of people at once with a single upload.",
      steps: [
        {
          title: "Open the Bulk Invite card",
          body:
            "On the Invite tab, scroll down to the Bulk invite card. Download the template first — it lists the exact columns the file needs.",
          imageUrl: invite.url,
          imageAlt: "Bulk invite card",
          hotspots: [
            { x: 27.0, y: 44.0, w: 15.5, h: 2.4, label: "Download template" },
            { x: 43.0, y: 44.0, w: 18.0, h: 2.4, label: "Choose file to upload" },
          ],
        },
        {
          title: "Pick the assessment for the batch",
          body:
            "Before uploading, choose the assessment every invitee in this batch should complete. This applies to the entire upload — split into multiple batches if different groups need different assessments.",
        },
        {
          title: "Review and send",
          body:
            "The tool shows you every row it parsed and flags any errors (bad email, missing department). Fix any issues, then send. Each invitee receives their own invitation email.",
        },
      ],
    },
    {
      id: "manage-users",
      title: "Manage existing users",
      summary: "Search users, assign supervisors, and deactivate access.",
      steps: [
        {
          title: "Open the Users tab",
          body:
            "On the User Management page, switch to the Users tab. Everyone linked to your organization appears here.",
          imageUrl: usersList.url,
          imageAlt: "User list with search and status",
          hotspots: [
            { x: 28.9, y: 11.0, w: 6.6, h: 1.6, label: "Users tab" },
            { x: 25.7, y: 23.5, w: 34.3, h: 1.6, label: "Search users" },
          ],
        },
        {
          title: "Fix missing supervisors",
          body:
            "If the yellow banner says users have no supervisor, click it to filter. Any dual-rater assessment (like AIRSA) requires a supervisor, so assign one before those invites go out.",
        },
        {
          title: "Deactivate a user",
          body:
            "Click a user's row to open the drawer, then choose Deactivate. Deactivated users lose access but their historical data stays in reports. You can reactivate later if they return.",
        },
      ],
    },
    {
      id: "team-paired-reports",
      title: "Generate a team or paired report",
      summary: "Build a Team PTP or Paired PTP report from members who have already completed the assessment.",
      steps: [
        {
          title: "Open Team & Paired Reports",
          body:
            "Click Team & Paired Reports in the sidebar. This is where every team or paired report you've generated lives.",
          imageUrl: teamPaired.url,
          imageAlt: "Team & Paired Reports page",
          hotspots: [
            { x: 1.2, y: 21.5, w: 18.3, h: 1.9, label: "Click Team & Paired Reports" },
            { x: 81.5, y: 7.0, w: 15.5, h: 2.4, label: "Generate report" },
          ],
        },
        {
          title: "Pick report type and members",
          body:
            "Click Generate report. Choose Team or Paired (Work, Personal, or Romantic), then pick the members. Only members who have completed PTP appear in the picker.",
        },
        {
          title: "Wait for the narrative",
          body:
            "Reports generate section by section. You can watch progress on the report itself — sections fill in as they finish. Once complete, share the URL with anyone in the group who should see it.",
        },
      ],
    },
    {
      id: "features",
      title: "Configure organization features",
      summary: "Review your contract and turn on org-wide options like team dashboards and mandatory MFA.",
      steps: [
        {
          title: "Open Features",
          body:
            "Click Features in the sidebar. The top card shows your contract configuration — tier, entitled assessments, and monthly allowances. These are read-only; contact BrainWise to change them.",
          imageUrl: features.url,
          imageAlt: "Organization Features page",
          hotspots: [
            { x: 1.2, y: 24.5, w: 18.3, h: 1.9, label: "Click Features" },
          ],
        },
        {
          title: "Toggle Supervisor Dashboard Access",
          body:
            "Turn this on to let every manager in your org view team dashboards for their direct reports. Individual privacy settings still apply.",
          imageUrl: features.url,
          imageAlt: "Supervisor Dashboard Access toggle",
          hotspots: [
            { x: 90.5, y: 39.5, w: 6.5, h: 1.9, label: "Supervisor dashboards toggle" },
          ],
        },
        {
          title: "Require two-factor authentication",
          body:
            "Turn on 'Require two-factor authentication for all users' to force every member to enroll in MFA before they can use the platform. Users who haven't enrolled will be prompted the next time they sign in.",
        },
        {
          title: "Set per-member feature overrides",
          body:
            "Scroll to Member Feature Overrides to disable specific features (AI Chat, PTP access) for individual members. You can restrict, but not grant beyond your contract.",
        },
      ],
    },
    {
      id: "interventions",
      title: "Track interventions",
      summary: "Assign, prioritize, and complete the recommendations generated from your team dashboards.",
      steps: [
        {
          title: "Open Interventions",
          body:
            "Under Dashboards, click Interventions. Every recommendation saved from a team or NAI dashboard shows up here with status, priority, target date, and owner.",
          imageUrl: interventions.url,
          imageAlt: "Intervention tracking page",
          hotspots: [
            { x: 1.2, y: 32.5, w: 18.3, h: 1.9, label: "Click Interventions" },
          ],
        },
        {
          title: "Assign an owner and target date",
          body:
            "Click any row to expand it. Assign an owner and target date so it stops showing up as Unassigned in the summary cards at the top.",
        },
        {
          title: "Create a custom intervention",
          body:
            "Click Create custom intervention (top right) to add something that isn't tied to an automated recommendation. Bulk import is available too for migrating a plan from a spreadsheet.",
          hotspots: [
            { x: 58.5, y: 10.5, w: 20.0, h: 2.5, label: "Create custom intervention" },
          ],
        },
      ],
    },
    {
      id: "resources",
      title: "Publish resources for your org",
      summary: "Curate documents, videos, and links your members can access from their Resources page.",
      steps: [
        {
          title: "Open Admin Resources",
          body:
            "Navigate to /admin/resources (or open Resources from the sidebar and switch to the admin view). Nothing is published until you add it here.",
          imageUrl: adminResources.url,
          imageAlt: "Admin resources page",
        },
        {
          title: "Add a resource",
          body:
            "Create folders for topics and add resources inside them — links, uploads, or Mux-streamed videos. Members see everything you publish under their own Resources tab.",
        },
      ],
    },
  ],
};
