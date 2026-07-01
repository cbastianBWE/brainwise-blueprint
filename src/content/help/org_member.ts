import type { HelpRoleContent } from "./types";
import dashboard from "@/assets/help/org_member/10_dashboard.png.asset.json";
import myResults from "@/assets/help/org_member/20_my_results.png.asset.json";
import devPlan from "@/assets/help/org_member/30_dev_plan.png.asset.json";
import shared from "@/assets/help/org_member/40_shared.png.asset.json";
import assessment from "@/assets/help/org_member/50_assessment.png.asset.json";
import notifications from "@/assets/help/org_member/60_notifications.png.asset.json";
import settings from "@/assets/help/org_member/70_settings.png.asset.json";

export const orgMemberContent: HelpRoleContent = {
  role: "org_member",
  label: "Org Member",
  description:
    "Your organization invited you onto BrainWise so your team can grow together. These are the tasks you'll do most often as a corporate member.",
  guides: [
    {
      id: "get-started",
      title: "Get started after your invite",
      summary: "Accept the invitation email, sign in, and land on your dashboard.",
      steps: [
        {
          title: "Open the invitation email",
          body:
            "Your org admin sent an invitation to the work email address they have on file. Open it and click the 'Accept invitation' button. If you can't find it, check your spam folder or ask your admin to resend.",
        },
        {
          title: "Create your password",
          body:
            "The link takes you to BrainWise and asks you to set a password. Use something secure — you'll use this email and password every time you sign in.",
        },
        {
          title: "Land on your dashboard",
          body:
            "You'll arrive at the dashboard. This is your home base — every assessment, report, and setting is one click away in the left sidebar.",
          imageUrl: dashboard.url,
          imageAlt: "Corporate member dashboard with sidebar navigation",
          hotspots: [
            { x: 1.2, y: 4.0, w: 18.3, h: 33.0, label: "Sidebar navigation" },
          ],
        },
      ],
    },
    {
      id: "take-assigned-assessment",
      title: "Take the assessment your admin assigned",
      summary: "Complete the assessment your organization needs — usually PTP or AIRSA.",
      steps: [
        {
          title: "Open the Assessment page",
          body:
            "Click Assessment in the sidebar. You'll see the assessments your organization has entitled for you. When your admin invited you they picked the specific assessment for you to complete first — it will be at the top.",
          imageUrl: assessment.url,
          imageAlt: "Assessment page listing available assessments",
          hotspots: [
            { x: 1.2, y: 14.0, w: 18.3, h: 1.9, label: "Click Assessment" },
          ],
        },
        {
          title: "Start and answer at your own pace",
          body:
            "Click Start on the assigned assessment. Your progress saves automatically — close the tab and come back later if you need to. Answer honestly; the report is only useful if the answers reflect how you actually work.",
        },
        {
          title: "Submit and see your results",
          body:
            "On the final question, click Submit. Scoring runs in the background and your report renders on the My Results page as soon as it's ready.",
        },
      ],
    },
    {
      id: "view-results",
      title: "View your results",
      summary: "Open your report, read your profile, and pick which assessment to view.",
      steps: [
        {
          title: "Open My Results",
          body:
            "Click My Results in the sidebar. If you have completed more than one assessment, use the dropdown in the top right to switch between them.",
          imageUrl: myResults.url,
          imageAlt: "My Results page with assessment selector",
          hotspots: [
            { x: 74.8, y: 6.2, w: 22.5, h: 2.3, label: "Switch assessment" },
          ],
        },
        {
          title: "Read at a glance and beyond",
          body:
            "The 'At a glance' cards give you the headline numbers. Scroll down to see your profile overview, domain heatmap, and per-skill breakdown. Every paragraph is highlightable — drag your cursor across any sentence to save it.",
        },
        {
          title: "Export a PDF if you want",
          body:
            "Click Export PDF near the top of the report to save a copy you can share with a coach or manager on your own terms.",
        },
      ],
    },
    {
      id: "development-plan",
      title: "Work your development plan",
      summary: "Turn insights into actions you can actually track week to week.",
      steps: [
        {
          title: "Open My Development Plan",
          body:
            "Click My Development Plan in the sidebar. The page pulls the top themes from your latest report and turns them into suggested actions you can commit to.",
          imageUrl: devPlan.url,
          imageAlt: "Development plan page",
          hotspots: [
            { x: 1.2, y: 20.5, w: 18.3, h: 1.9, label: "Click My Development Plan" },
          ],
        },
        {
          title: "Add or edit actions",
          body:
            "Add your own actions, mark ones as in-progress or done, and keep the list realistic. This is the page your manager or coach will most often look at with you.",
        },
      ],
    },
    {
      id: "shared-results",
      title: "See results shared with you",
      summary: "View reports your teammates chose to share with you.",
      steps: [
        {
          title: "Open Shared",
          body:
            "Click Shared in the sidebar. There are two tabs: 'Corp Shared Results' shows people in your organization who shared their results with you or with your department, and 'Generally Shared' shows outside sharing.",
          imageUrl: shared.url,
          imageAlt: "Shared results page with department listing",
          hotspots: [
            { x: 1.2, y: 12.5, w: 18.3, h: 1.9, label: "Click Shared" },
            { x: 23.5, y: 5.5, w: 30.0, h: 3.0, label: "Corp vs. Generally shared tabs" },
          ],
        },
        {
          title: "Pick a colleague to view",
          body:
            "Click a name on the left to open their report on the right. You'll only see people who chose to share with you — the list is empty until someone does.",
        },
      ],
    },
    {
      id: "notifications",
      title: "Adjust notification preferences",
      summary: "Control which emails and in-app alerts you get.",
      steps: [
        {
          title: "Open Notification Settings",
          body:
            "In the sidebar, click Settings, then Notification Settings. Each category has a 'Set all' control so you can turn a whole section on or off in one click.",
          imageUrl: notifications.url,
          imageAlt: "Notification settings page",
        },
      ],
    },
    {
      id: "profile-settings",
      title: "Update your profile & security",
      summary: "Change your name, password, and two-factor settings.",
      steps: [
        {
          title: "Open Settings",
          body:
            "Click Settings in the sidebar. From here you can update your display name, change your password, enroll or manage two-factor authentication, and review devices you've trusted.",
          imageUrl: settings.url,
          imageAlt: "Settings page",
        },
        {
          title: "Trust this device (optional)",
          body:
            "If your admin requires MFA, you can mark a browser as trusted when you sign in so you don't have to enter your code every time. Manage or revoke trusted browsers from Settings.",
        },
      ],
    },
  ],
};
