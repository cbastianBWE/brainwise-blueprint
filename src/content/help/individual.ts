import type { HelpRoleContent } from "./types";
import dashboard from "@/assets/help/individual/10_dashboard.png.asset.json";
import assessmentLanding from "@/assets/help/individual/20_assessment_landing.png.asset.json";
import myResults from "@/assets/help/individual/30_my_results.png.asset.json";
import myResultsScroll from "@/assets/help/individual/31_my_results_scroll.png.asset.json";
import devPlan from "@/assets/help/individual/40_development_plan.png.asset.json";
import sharedWithMe from "@/assets/help/individual/50_shared_with_me.png.asset.json";
import sharingRequests from "@/assets/help/individual/51_sharing_requests.png.asset.json";
import notif from "@/assets/help/individual/60_notification_settings.png.asset.json";
import notifScroll from "@/assets/help/individual/61_notification_settings_scroll.png.asset.json";
import settings from "@/assets/help/individual/70_settings.png.asset.json";

export const individualContent: HelpRoleContent = {
  role: "individual",
  label: "Individual",
  description:
    "You signed up on your own to take assessments and grow your self-awareness. These are the tasks people do most often.",
  guides: [
    {
      id: "take-an-assessment",
      title: "Take an assessment",
      summary: "Start a new assessment, work through it, and see your results the moment it finishes.",
      steps: [
        {
          title: "Open the Assessment page",
          body:
            "In the sidebar on the left, click Assessment. This is where every assessment you can take is listed.",
          imageUrl: dashboard.url,
          imageAlt: "Sidebar with Assessment link highlighted",
          hotspots: [
            { x: 1.2, y: 14.0, w: 18.3, h: 1.9, label: "Click Assessment" },
          ],
        },
        {
          title: "Pick an assessment and start",
          body:
            "You'll see the assessments available to you. Click Start on the one you want to take. If it's your first time, you may be asked to acknowledge how the assessment works before questions begin.",
          imageUrl: assessmentLanding.url,
          imageAlt: "Assessment landing page listing available assessments",
          hotspots: [
            { x: 26.3, y: 14.4, w: 32.8, h: 13.4, label: "Pick an assessment card" },
          ],
        },
        {
          title: "Work through the questions",
          body:
            "Answer each question honestly and at your own pace. Your progress is saved automatically, so you can close the tab and come back later — you'll pick up where you left off.",
        },
        {
          title: "Submit and view your results",
          body:
            "After the final question, click Submit. You'll be taken to My Results, where your report renders as soon as scoring finishes.",
          imageUrl: myResults.url,
          imageAlt: "My Results page after assessment submission",
        },
      ],
    },
    {
      id: "view-your-results",
      title: "View your results",
      summary: "Read your personalized report, explore each dimension, and see coaching questions.",
      steps: [
        {
          title: "Go to My Results",
          body:
            "Click My Results in the sidebar. If you have more than one completed assessment, use the selector at the top to switch between them.",
          imageUrl: myResults.url,
          imageAlt: "My Results page overview",
          hotspots: [
            { x: 1.2, y: 8.0, w: 18.3, h: 1.9, label: "Click My Results" },
          ],
        },
        {
          title: "Read the narrative sections",
          body:
            "Scroll down through the profile overview and each dimension. Each section explains what your scores mean and what to do about them in plain language.",
          imageUrl: myResultsScroll.url,
          imageAlt: "My Results narrative scrolled to show dimensions",
        },
        {
          title: "Use coaching questions to reflect",
          body:
            "Every section ends with reflection prompts. Read them, pause, and jot down what comes up for you. These are the questions a great coach would ask.",
        },
      ],
    },
    {
      id: "highlight-and-annotate",
      title: "Highlight and annotate your report",
      summary: "Mark the sentences that matter to you and keep them for later.",
      steps: [
        {
          title: "Select the text you want to highlight",
          body:
            "Anywhere in the narrative, click and drag across the sentence or paragraph you want to keep. A small color picker appears.",
          imageUrl: myResultsScroll.url,
          imageAlt: "Selecting text in the narrative report",
        },
        {
          title: "Pick a highlight color",
          body:
            "Choose a color from the popover. The highlight saves instantly to your account and stays there next time you open the report — on any device.",
        },
        {
          title: "Remove a highlight",
          body:
            "Click any existing highlight to open its menu and choose Remove. Highlights are personal to you and never shared without your permission.",
        },
      ],
    },
    {
      id: "share-with-a-coach",
      title: "Share results with a coach",
      summary: "Grant a coach or trusted person read access to your report.",
      steps: [
        {
          title: "Open the sharing screen",
          body:
            "Go to Settings → Sharing Requests, or use the Shared With Me link in the sidebar to see who currently has access to your results.",
          imageUrl: sharingRequests.url,
          imageAlt: "Sharing requests screen",
          hotspots: [
            { x: 1.2, y: 24.0, w: 18.3, h: 1.9, label: "Open Settings" },
          ],
        },
        {
          title: "Invite by email",
          body:
            "Enter the email address of the person you want to share with, choose what they can see, and send the invite. They'll get a link to view your report.",
        },
        {
          title: "Review who has access, revoke anytime",
          body:
            "The list shows every active share. Click Revoke next to any name to remove their access immediately.",
          imageUrl: sharedWithMe.url,
          imageAlt: "Shared With Me listing current shares",
        },
      ],
    },
    {
      id: "manage-notifications",
      title: "Manage notifications",
      summary: "Choose which emails and in-app alerts you want to receive.",
      steps: [
        {
          title: "Open notification settings",
          body:
            "Go to Settings → Notifications from the sidebar. You'll see notifications grouped by category (results, sharing, learning, etc.).",
          imageUrl: notif.url,
          imageAlt: "Notification settings page",
        },
        {
          title: "Toggle individual notifications",
          body:
            "Each notification has an Email and In-app toggle. Turn on the ones you want, turn off the ones you don't. Changes save automatically.",
          imageUrl: notifScroll.url,
          imageAlt: "Notification categories with toggles",
        },
        {
          title: "Use \"Set all\" for a whole category",
          body:
            "Each category has a Set all dropdown at the top-right. Use it to switch every notification in that category on or off in one click.",
          imageUrl: notifScroll.url,
          imageAlt: "Set all dropdown on a notification category",
          hotspots: [
            { x: 69.8, y: 14.4, w: 12.0, h: 1.4, label: "Set all to…" },
          ],
        },
        {
          title: "General account settings",
          body:
            "For your profile, password, and privacy preferences, use the other tabs under Settings.",
          imageUrl: settings.url,
          imageAlt: "General settings page",
        },
      ],
    },
  ],
};
