// Auto-generated content for Services page.
// Last updated: May 1, 2026
// Source: Cole-approved copy, Session 39.

export type ServiceCard = {
  id: string;
  title: string;
  summary: string;
  body: string;
  benefits: string[];
  cta: { label: string; action: "open-briefing" | "navigate"; to?: string };
};

export const meta = {
  eyebrow: "Services",
  title: "AI adoption that doesn't stall in week six.",
  subhead:
    "Most enterprise AI initiatives fail not because the tools are wrong, but because the organization isn't ready to absorb them. We close that gap with an evidence-based readiness program built on the same neuroscience that powers our assessments.",
  methodologyEyebrow: "How It Works",
  methodologyTitle: "Built on neuroscience, not vibes.",
  methodologyBody1:
    "The BrainWise approach starts from a simple observation: people don't resist new tools, they resist the discomfort that comes with using them. Our Personal Threat Profile (PTP) measures that discomfort across five dimensions — Protection, Participation, Prediction, Purpose, and Pleasure — derived from Oxford Brain Institute research on threat-reward neural patterns. The Neuroscience Adoption Index (NAI) measures the corresponding workforce readiness across the C.A.F.E.S. dimensions: Certainty, Agency, Fairness, Ego Stability, and Saturation Threshold.",
  methodologyBody2:
    "When we run both instruments across your workforce, we get something most readiness consultancies can't: a structural map of where your organization will accelerate, where it will resist, and what specifically to do about each. That map drives every recommendation we make. No generic frameworks, no \"best practice\" handouts.",
  ctaSectionEyebrow: "Get Started",
  ctaSectionTitle: "Tell us about your team.",
  ctaSectionBody:
    "A 30-minute briefing. No deck pitch. We'll discuss your current state, what's working, and whether our approach fits.",
};

export const services: ServiceCard[] = [
  {
    id: "ai-adoption-consulting",
    title: "AI Adoption Consulting",
    summary:
      "Diagnose, design, and deploy AI initiatives that don't stall in week six.",
    body:
      "Most enterprise AI initiatives fail not because the tools are wrong, but because the organization isn't ready to absorb them. Our consulting engagement runs three workstreams: a workforce readiness diagnostic using PTP and NAI to surface where your organization is fluent and where it stalls, a tailored adoption framework built on what your data actually shows, and ongoing deployment support delivered alongside certified BrainWise coaches with structured check-ins at 30, 60, and 90 days post-launch.",
    benefits: [
      "Workforce readiness diagnostic with prioritized intervention areas",
      "Tailored adoption framework built on your specific friction points",
      "90 days of deployment support with certified coaches",
      "Leadership-readable reporting throughout",
    ],
    cta: { label: "Book a Briefing", action: "open-briefing" },
  },
  {
    id: "coach-certification",
    title: "Coach Certification",
    summary:
      "Train as a BrainWise-certified coach across four specialized tracks.",
    body:
      "BrainWise certifies coaches in four tracks: Personal Threat Profile (PTP), AI Transformation Coaching, Combined Certification, and the My BrainWise Coach program. Each track combines virtual instructor-led training with supervised debrief practice — including known and unknown actor scenarios, peer observation, and your own debrief experience. Certified coaches gain platform access for client management, coach-paid client billing, the full assessment library, and the ongoing coach resources hub.",
    benefits: [
      "Four specialized certification tracks to match your practice",
      "Virtual instructor-led training with supervised debrief practice",
      "Platform access for client management and self-pay or coach-paid billing",
      "Ongoing access to certification resources and assessment updates",
    ],
    cta: { label: "Explore certifications", action: "navigate", to: "/products#coach-certifications" },
  },
  {
    id: "leadership-development",
    title: "Leadership Development",
    summary:
      "Develop leaders who can navigate uncertainty and drive adoption across their teams.",
    body:
      "Leadership development at BrainWise starts with measurement, not workshops. Each program begins with the leadership team completing PTP and NAI, plus the Executive Perspective NAI variant where leaders rate how they believe their employees are experiencing change. The gap between leader self-perception, employee experience, and leader-perceived employee experience is often the most actionable finding of any engagement. From there, programs target specific dimensions: change tolerance, decision-making under uncertainty, team alignment during transitions, and building psychological safety around AI adoption. Delivered as cohort workshops, 1:1 development tracks, or hybrid formats based on engagement size.",
    benefits: [
      "Leadership-team assessment including the Executive Perspective NAI variant",
      "Gap analysis comparing leader self-perception vs. workforce reality",
      "Custom development plans targeting specific dimensions",
      "Cohort workshops, 1:1 tracks, or hybrid formats",
    ],
    cta: { label: "Book a Briefing", action: "open-briefing" },
  },
  {
    id: "executive-strategy",
    title: "Executive Strategy",
    summary:
      "Strategic counsel grounded in workforce neuroscience and adoption data.",
    body:
      "We advise executives on strategic decisions where workforce readiness, change capacity, and adoption risk are central concerns. Common engagement areas include AI adoption strategy and roadmap, pre- and post-merger workforce integration, organizational redesign with attached change-readiness diagnostics, post-incident change management following layoffs or restructuring, and board-level reporting on workforce adoption metrics. Engagements run as advisory retainers (monthly access for ongoing decisions) or as project-scoped engagements with defined deliverables.",
    benefits: [
      "Executive-level strategic counsel with direct partner access",
      "Workforce data integrated into major strategic decisions",
      "Pre-decision diagnostics for change initiatives and reorganizations",
      "Flexible models — monthly retainer or project-scoped engagement",
    ],
    cta: { label: "Book a Briefing", action: "open-briefing" },
  },
  {
    id: "executive-coaching",
    title: "Executive Coaching",
    summary:
      "1:1 coaching for senior leaders, grounded in their personal threat and adoption profile.",
    body:
      "Executive coaching with BrainWise starts where most coaching ends — with data. Each engagement begins with the leader completing the full Personal Threat Profile and Neuroscience Adoption Index, giving the coach a structural map of where this leader is fluent, where they stall, and which dimensions matter most for their current role and challenges. Coaching sessions then focus on those specific dimensions rather than open-ended exploration. Delivered by BrainWise-certified coaches matched to the leader's profile and industry context. Engagements typically run six to twelve months with quarterly progress reviews against measurable dimensional shifts.",
    benefits: [
      "Initial PTP and NAI assessment with detailed personal debrief",
      "Coaching sessions structured around your individual data",
      "Quarterly progress reviews with measurable dimensional change",
      "Coach matched to your profile and industry",
    ],
    cta: { label: "Book a Briefing", action: "open-briefing" },
  },
  {
    id: "learning-development-services",
    title: "Learning & Development Services",
    summary:
      "Instructional design, LMS administration, and end-to-end L&D execution capacity.",
    body:
      "For organizations that need execution capacity beyond the BrainWise platform, we deliver a full set of learning and development services. This includes instructional design for custom curricula tied to your adoption goals, LMS administration and migration (Cornerstone, Workday Learning, Docebo, and others), digital learning content production, learning-impact evaluation tying training investment to measurable outcomes, and on-call L&D advisory for teams without a dedicated function. We can plug into your existing L&D org or operate as your outsourced team.",
    benefits: [
      "Custom instructional design and curriculum development",
      "LMS administration, migration, and ongoing operations",
      "Digital learning content production",
      "Learning-impact evaluation and ROI measurement",
    ],
    cta: { label: "Book a Briefing", action: "open-briefing" },
  },
];
