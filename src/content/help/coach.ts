import type { HelpRoleContent } from "./types";
import myClients from "@/assets/help/coach/10_my_clients.png.asset.json";
import clientResults from "@/assets/help/coach/11_client_results.png.asset.json";
import feedbackTemplates from "@/assets/help/coach/20_feedback_templates.png.asset.json";
import teamPaired from "@/assets/help/coach/30_team_paired.png.asset.json";
import orders from "@/assets/help/coach/40_orders.png.asset.json";
import orderAssessment from "@/assets/help/coach/41_order_assessment.png.asset.json";
import certification from "@/assets/help/coach/60_certification.png.asset.json";
import aiChat from "@/assets/help/coach/70_ai_chat.png.asset.json";
import resourcesPage from "@/assets/help/coach/80_resources.png.asset.json";
import coachDashboard from "@/assets/help/coach/90_dashboard.png.asset.json";
import coachMyResults from "@/assets/help/coach/91_my_results.png.asset.json";
import coachSettings from "@/assets/help/coach/92_settings.png.asset.json";

// Sidebar hotspots (percentages of a 1280x1800 screenshot). Item height ≈ 1.7%.
const SB = { x: 1.2, w: 17.2, h: 1.7 };
const SIDEBAR = {
  myClients:        { ...SB, y: 16.1 },
  clientResults:    { ...SB, y: 18.1, x: 4.0, w: 14.4 },
  mentorPortal:     { ...SB, y: 20.1 },
  feedbackTemplates:{ ...SB, y: 22.1 },
  teamPaired:       { ...SB, y: 24.1 },
  invoices:         { ...SB, y: 26.1 },
  certification:    { ...SB, y: 34.1 },
};

export const coachContent: HelpRoleContent = {
  role: "coach",
  label: "Coach",
  description:
    "You use BrainWise with your own coaching clients. These are the tasks coaches do most often — invite clients, order assessments, review their results, and generate team or paired reports.",
  guides: [
    {
      id: "invite-and-manage-clients",
      title: "Invite and manage your clients",
      summary: "Add a coaching client, send them an assessment invite, and track their status.",
      steps: [
        {
          title: "Open My Clients",
          body:
            "In the sidebar, click My Clients. This is your roster of coaching clients and the hub for inviting new ones.",
          imageUrl: myClients.url,
          imageAlt: "Coach sidebar with My Clients highlighted",
          hotspots: [{ ...SIDEBAR.myClients, label: "Click My Clients" }],
        },
        {
          title: "Order an assessment for a client",
          body:
            "Click Order Assessment in the top-right. Choose the assessment, pick who pays (you or the client), and enter the client's name and email. They'll receive an invite by email and appear in Pending Invitations until they complete it.",
          imageUrl: myClients.url,
          imageAlt: "Order Assessment button on the My Clients page",
          hotspots: [
            { x: 66.0, y: 7.4, w: 15.0, h: 2.2, label: "Order Assessment" },
          ],
        },
        {
          title: "Watch invites turn into clients",
          body:
            "The status tiles at the top show Total Clients, Pending Invitations, Completed This Month, and Assessments Pending. Use the Pending Invitations tab to resend or revoke invites before they're accepted.",
          imageUrl: myClients.url,
          imageAlt: "My Clients status tiles and tabs",
          hotspots: [
            { x: 26.0, y: 18.0, w: 15.0, h: 2.0, label: "Pending Invitations" },
          ],
        },
      ],
    },
    {
      id: "view-client-results",
      title: "View a client's results",
      summary: "Open a client's completed assessment and walk through it with them.",
      steps: [
        {
          title: "Open Client Results",
          body:
            "In the sidebar, expand My Clients and click Client Results. Every client who has completed an assessment appears here.",
          imageUrl: clientResults.url,
          imageAlt: "Sidebar with Client Results highlighted",
          hotspots: [{ ...SIDEBAR.clientResults, label: "Click Client Results" }],
        },
        {
          title: "Find the right client",
          body:
            "Use the search box at the top to filter by name or email. Click any client card to open their full report.",
          imageUrl: clientResults.url,
          imageAlt: "Client Results list with search field",
          hotspots: [
            { x: 26.0, y: 9.4, w: 55.0, h: 2.6, label: "Search" },
          ],
        },
        {
          title: "Read and share the report",
          body:
            "Once open, the client's report renders just like your own. You can highlight passages during a debrief; your highlights are visible to you and any coach the client has shared with.",
        },
      ],
    },
    {
      id: "order-assessments",
      title: "Order assessments in bulk",
      summary: "Buy assessment credits to send to clients.",
      steps: [
        {
          title: "Open Orders & Invoices",
          body:
            "In the sidebar, click Orders & Invoices. This is where you see past orders, download invoices, and start a new order.",
          imageUrl: orders.url,
          imageAlt: "Sidebar with Orders & Invoices highlighted",
          hotspots: [{ ...SIDEBAR.invoices, label: "Click Orders & Invoices" }],
        },
        {
          title: "Order Assessment",
          body:
            "Click Order Assessment to start a new purchase. Pick the assessment, the quantity, and the payer, then check out. Credits show up immediately after payment and can be sent to clients from My Clients.",
          imageUrl: orderAssessment.url,
          imageAlt: "Order Assessment page",
        },
      ],
    },
    {
      id: "team-paired-reports",
      title: "Generate a Team or Paired report",
      summary: "Combine multiple clients' results into a team or paired PTP report.",
      steps: [
        {
          title: "Open Team & Paired Reports",
          body:
            "In the sidebar, click Team & Paired Reports. You'll see every report you've generated so far.",
          imageUrl: teamPaired.url,
          imageAlt: "Sidebar with Team & Paired Reports highlighted",
          hotspots: [{ ...SIDEBAR.teamPaired, label: "Click Team & Paired Reports" }],
        },
        {
          title: "Generate a new report",
          body:
            "Click Generate report (top-right) or Generate your first report. Pick the type (Team, Work Pair, Personal Pair, Romantic Pair), select the clients to include, then submit. The report generates section-by-section — you can start reading as soon as the first section is ready.",
          imageUrl: teamPaired.url,
          imageAlt: "Generate report button on Team & Paired Reports",
          hotspots: [
            { x: 66.0, y: 7.4, w: 15.0, h: 2.2, label: "Generate report" },
          ],
        },
        {
          title: "Open and share the report",
          body:
            "Click any report in the list to open the full interactive view. Subjects (the people the report is about) can be given read access — they'll see it under Shared With Me on their own account.",
        },
      ],
    },
    {
      id: "feedback-templates",
      title: "Save feedback templates",
      summary: "Reuse the same coaching feedback across multiple review panels.",
      steps: [
        {
          title: "Open Feedback Templates",
          body:
            "In the sidebar, click Feedback Templates. Templates are grouped by review panel type (Written Summary, Skills Practice, etc.) and are private to you.",
          imageUrl: feedbackTemplates.url,
          imageAlt: "Feedback templates page grouped by review panel type",
          hotspots: [{ ...SIDEBAR.feedbackTemplates, label: "Click Feedback Templates" }],
        },
        {
          title: "Create a new template",
          body:
            "Click New template on the panel type you want (for example Written Summary). Give it a name, write the reusable text, and save. It's now available every time you're leaving feedback on that panel type.",
          imageUrl: feedbackTemplates.url,
          imageAlt: "New template button on a review panel",
          hotspots: [
            { x: 55.0, y: 12.2, w: 13.5, h: 2.0, label: "New template" },
          ],
        },
      ],
    },
    {
      id: "certification",
      title: "Track your certification",
      summary: "See your certification progress and next required steps.",
      steps: [
        {
          title: "Open Certification",
          body:
            "In the sidebar, click Certification. You'll see your current certification path, completed modules, mentor reviews, and what's still outstanding.",
          imageUrl: certification.url,
          imageAlt: "Sidebar with Certification highlighted",
          hotspots: [{ ...SIDEBAR.certification, label: "Click Certification" }],
        },
        {
          title: "Work through required items",
          body:
            "Each requirement links to the exact page you need — a module to complete, an assessment to take, or a review panel to submit for mentor feedback.",
        },
      ],
    },
    {
      id: "coach-dashboard",
      title: "Use your coach dashboard",
      summary: "Get oriented every time you sign in — the dashboard is your daily home.",
      steps: [
        {
          title: "Land on Dashboard",
          body:
            "Sign in and you'll arrive at Dashboard. Quick-jump cards take you to My Clients, Team & Paired Reports, and Client Results, and any in-progress assessments of your own appear in 'Continue where you left off'.",
          imageUrl: coachDashboard.url,
          imageAlt: "Coach dashboard with quick-jump cards",
        },
        {
          title: "Switch to a client's report from here",
          body:
            "Use the Client Results card to jump straight into whichever client you're about to debrief with. It saves a click compared to opening the full My Clients roster.",
        },
      ],
    },
    {
      id: "prepare-with-ai-chat",
      title: "Prepare for a session with AI Chat",
      summary: "Talk through a client's report with AI before your session.",
      steps: [
        {
          title: "Open AI Chat",
          body:
            "Click AI Chat in the sidebar. As a coach, you can load any client whose results you have access to into the assessment context bar at the top.",
          imageUrl: aiChat.url,
          imageAlt: "Coach AI Chat with client context selector",
          hotspots: [
            { x: 1.2, y: 27.0, w: 18.3, h: 1.9, label: "Click AI Chat" },
          ],
        },
        {
          title: "Ask session-prep questions",
          body:
            "Prompts that work well: 'Summarize this client's PTP in three bullets', 'What tensions between drivers should we explore?', 'Suggest three coaching questions for a debrief.' The assistant treats your client's report as context, not as chat memory the client will see.",
        },
        {
          title: "Save the conversation for later",
          body:
            "Every conversation is saved automatically under Chat History. Reopen it during your next session with the same client so context carries forward.",
        },
      ],
    },
    {
      id: "coach-resources",
      title: "Find and use Coach Resources",
      summary: "Access reference cards, videos, and debrief guides curated for coaches.",
      steps: [
        {
          title: "Open Resources",
          body:
            "Click Resources in the sidebar. As a coach you'll land on the Coach Resources tab by default — it holds the PTP coach cards, debrief videos ('What Great Looks Like'), and every reference guide.",
          imageUrl: resourcesPage.url,
          imageAlt: "Coach Resources page with folders and guides",
          hotspots: [
            { x: 33.5, y: 9.5, w: 15.5, h: 2.4, label: "Coach Resources tab" },
          ],
        },
        {
          title: "Open a folder or resource",
          body:
            "Folders like 'PTP Coach Cards' group related material. Everything on this page is also shown at the top level so you can browse quickly without drilling in. Use the search bar to jump to a specific topic.",
        },
        {
          title: "Watch a debrief video",
          body:
            "Video resources (like the WGLL debrief example) stream via Mux — hit play and share your screen if you're using it during a session.",
        },
      ],
    },
    {
      id: "coach-own-results",
      title: "Manage your own assessments",
      summary: "You take BrainWise assessments too — treat your own results like any client.",
      steps: [
        {
          title: "Open My Assessments",
          body:
            "Click My Assessments in the sidebar to see everything you've completed personally. This is separate from Client Results and stays private to you.",
          imageUrl: coachMyResults.url,
          imageAlt: "Coach's own My Results page",
        },
        {
          title: "Take a new assessment",
          body:
            "Use the Take Another Assessment button on your report to complete another instrument. Your own results show up in your AI Chat context too, which is useful when you want to compare yourself with a client's profile.",
        },
      ],
    },
    {
      id: "coach-account-security",
      title: "Update account & security settings",
      summary: "Change your password, enable 2FA, and manage trusted devices.",
      steps: [
        {
          title: "Open Settings",
          body:
            "Click Settings in the sidebar. Your profile info, password, notification preferences, two-factor authentication, and trusted devices are all here.",
          imageUrl: coachSettings.url,
          imageAlt: "Coach settings page",
        },
        {
          title: "Enable two-factor authentication",
          body:
            "In the Two-Factor Authentication card, click Enable and scan the QR code with an authenticator app. As a coach with access to client data, keeping 2FA on is strongly recommended.",
        },
        {
          title: "Revoke trusted devices",
          body:
            "Open the Trusted Devices card to see every browser that skips your 2FA prompt. Click Revoke on anything unfamiliar or that you no longer use.",
        },
      ],
    },
  ],
};
