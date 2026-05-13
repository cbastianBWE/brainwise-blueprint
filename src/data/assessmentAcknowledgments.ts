// Pre-instrument acknowledgment content + version hashes.
// IMPORTANT: any edit to a `body` string changes its hash automatically (lazy SHA-256).

export type AcknowledgmentKey =
  | "INST-001:self"
  | "INST-002:self"
  | "INST-002L:self"
  | "INST-003:self"
  | "INST-003:manager"
  | "INST-004:self";

export interface AcknowledgmentContent {
  title: string;
  body: string;
  buttonLabel: string;
}

export const acknowledgmentContent: Record<AcknowledgmentKey, AcknowledgmentContent> = {
  "INST-001:self": {
    title: "Before You Begin: Personal Threat Profile (PTP)",
    body: `The PTP is an 89-item self-report assessment of how you typically respond to threat, reward, and the social and environmental factors that shape those responses. The goal is to map your patterns, not to label you.

A few things to know before you start:

**There are no right or wrong answers.** The PTP describes patterns, not performance. Higher or lower scores are not better or worse — they're different ways of engaging with the world. Try to describe yourself as you actually are, not as you wish you were or think you should be.

**Go with your first instinct.** Read each statement, then choose the response that fits closest to your typical reaction. Don't overthink — your first instinct is usually the most accurate.

**Find an uninterrupted block of time.** The PTP takes about 20–25 minutes to complete. You'll get the most accurate results if you take it in one sitting, in a quiet place, when you're not rushed or significantly stressed. Your responses are saved as you go, so if you do need to step away, you can resume where you left off.

**Who sees your results.** Your individual PTP report is yours by default. If a coach invited you, your coach will also receive your report so they can support your development. Your results are not shared with your organization, your manager, or anyone else unless you explicitly grant access through your sharing settings. You can grant, revoke, or modify access at any time after viewing your report.

**Use of your results.** The PTP is a developmental tool — it's designed to inform coaching, self-awareness, and growth. It is not a clinical diagnosis and should not be used in isolation for hiring, promotion, or termination decisions.`,
    buttonLabel: "Begin Assessment",
  },

  "INST-002:self": {
    title: "Before You Begin: Neuroscience AI Readiness Assessment (NAI)",
    body: `The NAI is a 25-item self-report assessment that measures your readiness to engage with AI tools across five neuroscience-based dimensions: Certainty, Agency, Fairness, Ego Stability, and Saturation (the C.A.F.E.S. model).

A few things to know before you start:

**There are no right or wrong answers.** This is not a test of your AI knowledge or skill. It measures how you tend to feel and respond when working with AI, which shapes how effectively you can adopt and use these tools.

**Go with your first instinct.** Read each statement and choose the response that fits closest to your typical reaction. Don't overthink — your first instinct is usually most accurate.

**Find an uninterrupted block of time.** The NAI takes about 7–10 minutes. Take it in one sitting, in a quiet place, when you're not rushed. Your responses are saved as you go if you do need to step away.

**Who sees your results.** Your individual NAI report is yours. If a coach invited you, your coach will also receive your report so they can support your development. Your individual NAI responses are never shared with your organization, your manager, or anyone else — even if your organization purchased the assessment for you. Your organization may see aggregate, de-identified group-level summaries (for example, average scores across a team or department) used to inform organization-wide AI rollout planning, but never individual responses tied to you.

**Use of your results.** The NAI is a developmental tool. It informs coaching, training design, and AI adoption planning. It is not a measure of intelligence, capability, or fitness for any role.`,
    buttonLabel: "Begin Assessment",
  },

  "INST-002L:self": {
    title: "Before You Begin: Executive Perspective NAI (EPN)",
    body: `Your organization has asked you to complete the Executive Perspective NAI as part of an AI readiness initiative. The EPN is a 25-item self-report assessment measuring your readiness to engage with AI tools across five neuroscience-based dimensions: Certainty, Agency, Fairness, Ego Stability, and Saturation (the C.A.F.E.S. model). The "Executive Perspective" framing means your responses will be combined with those of other leaders in your organization to inform how your organization rolls out AI.

A few things to know before you start:

**There are no right or wrong answers.** This is not a test of your AI knowledge, skill, or leadership ability. It measures how you tend to feel and respond when working with AI, which shapes how effectively you and your organization can adopt these tools.

**Answer honestly.** Your organization needs accurate data to make good rollout decisions. Inflated or deflated responses — toward what you think your organization wants to hear — reduce the quality of the decisions that follow. Describe yourself as you actually are.

**Go with your first instinct.** Read each statement and choose the response that fits closest to your typical reaction. Don't overthink — your first instinct is usually most accurate.

**Find an uninterrupted block of time.** The EPN takes about 7–10 minutes. Take it in one sitting, in a quiet place, when you're not rushed. Your responses are saved as you go if you do need to step away.

**Who sees your results.** Your individual EPN report is yours. Your individual responses are never shared with anyone in your organization — including the person who assigned this to you. Your organization will see only aggregate, de-identified group-level summaries (for example, average scores across your leadership team) used to inform AI rollout planning. Your name, your individual scores, and your specific item-level responses are not visible to anyone but you.

**Use of your results.** The EPN is a developmental and planning tool. It informs your organization's AI training design and rollout strategy at a group level. It is not a measure of your performance, leadership effectiveness, or fitness for any role, and it will not be used in compensation, promotion, or other employment decisions about you.`,
    buttonLabel: "Begin Assessment",
  },

  "INST-003:self": {
    title: "Before You Begin: AI Readiness Self-Assessment (AIRSA)",
    body: `The AIRSA is a 24-item assessment of your AI-related capabilities across eight workplace domains. It is a **dual-rater** assessment — you will rate yourself, and your direct manager will rate you separately on the same domains. Your scores are reported side-by-side so you and your manager can identify areas of alignment and areas where your perspectives differ.

A few things to know before you start:

**Rate yourself honestly.** Aim to describe your current capability and behavior, not the level you aspire to. Overstating or understating reduces the value of the comparison with your manager's rating.

**Go with your first instinct.** Choose the response that fits closest to your current state in each area. Don't overthink.

**Find an uninterrupted block of time.** AIRSA takes about 8–10 minutes. Take it in one sitting, in a quiet place. Your responses are saved as you go if you do need to step away.

**Who sees your results.** Your AIRSA self-ratings will be visible to your manager (who is also rating you) and your organization's BrainWise administrators. If a coach invited you or is supporting you through this assessment, your coach will also receive your report. Side-by-side comparison reports of your self-rating and your manager's rating are generated once both ratings are complete. Your responses are not visible to your peers, direct reports, or anyone else.

**Use of your results.** The AIRSA is designed to support development conversations, coaching, and team-level AI capability planning. It is not a performance review and should not be used in isolation for hiring, promotion, or termination decisions.`,
    buttonLabel: "Begin Assessment",
  },

  "INST-003:manager": {
    title: "Before You Begin: Rating an Employee on the AIRSA",
    body: `You've been asked to rate an employee on the AI Readiness Self-Assessment (AIRSA). The AIRSA measures AI-related capabilities across eight workplace domains. The employee is also rating themselves on the same items, and your two ratings will be reported side-by-side to support a development conversation.

A few things to know before you start:

**Rate based on what you've directly observed.** Describe what you've actually seen the employee do in their work over the past 3–6 months. Avoid rating based on potential, intent, or things you've only heard secondhand.

**Be candid.** This is a development assessment, not a performance review. Inflated or deflated ratings reduce the value of the comparison and make the resulting conversation less useful for both of you.

**Find an uninterrupted block of time.** AIRSA takes about 8–10 minutes. Take it in one sitting, in a quiet place. Your responses are saved as you go if you do need to step away.

**Who sees your results.** The employee will see your individual ratings as part of their AIRSA report. Your name will be identified in the report as their manager — this is different from anonymous 360 feedback. Your organization's BrainWise administrators can also view the report. If the employee has a coach supporting them through this assessment, that coach will also see your ratings.

**Use of these results.** The AIRSA is designed to support development conversations and coaching. It is not a performance review and should not be used in isolation for compensation, promotion, or termination decisions.`,
    buttonLabel: "Begin Assessment",
  },

  "INST-004:self": {
    title: "Habit Self-Survey (HSS) — Quick Check-in",
    body: `The HSS is a brief 6-item check-in on how the AI-related habits you're building are progressing. It takes about 2 minutes.

Be honest — even if a week didn't go the way you hoped, an accurate read is more useful than an optimistic one for tracking your progress over time. Your responses are visible to your organization's BrainWise administrators, and to your coach if a coach is supporting you.`,
    buttonLabel: "Start Check-in",
  },
};

const computeHash = async (text: string): Promise<string> => {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const hashCache = new Map<AcknowledgmentKey, string>();

export async function getAcknowledgmentWithHash(
  instrumentId: string,
  raterType: "self" | "manager"
): Promise<AcknowledgmentContent & { versionHash: string; key: AcknowledgmentKey }> {
  const key = `${instrumentId}:${raterType}` as AcknowledgmentKey;
  const content = acknowledgmentContent[key];
  if (!content) throw new Error(`No acknowledgment defined for ${key}`);
  if (!hashCache.has(key)) {
    hashCache.set(key, await computeHash(content.body));
  }
  return { ...content, versionHash: hashCache.get(key)!, key };
}
