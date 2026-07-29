import type { CoupleContext, CoupleStep } from "../coupleShared";

// ---- Contexts ----

export const waitingContext: CoupleContext = {
  ownFirstName: "Sam",
  otherFirstName: "Josh",
  partnerSubmitted: false,
  barrierCleared: false,
  partnerView: null,
};

export const revealedContext: CoupleContext = {
  ownFirstName: "Sam",
  otherFirstName: "Josh",
  partnerSubmitted: true,
  barrierCleared: true,
  partnerView: {
    disclosure: "full",
    responses: {
      self: { q1: "Being trusted with the hard stuff.", q2: "When plans change without warning." },
      read: { q1: "Probably being listened to properly.", q2: "Late nights, I think." },
      money: "We should talk about the joint account.",
      time: "Sunday mornings are ours.",
      ownRating: "7",
      readRating: "5",
      owned_moves: ["I go quiet when it gets hard.", "I fix instead of listening."],
      share_estimate: "I'd say I'm carrying about 60% of it right now.",
      summary: "Josh says the honest version is that he's tired, and he wants more slow time together.",
    },
  },
};

export const summaryContext: CoupleContext = {
  ...revealedContext,
  partnerView: {
    disclosure: "summary",
    responses: {
      summary: "Josh says the honest version is that he's tired, and he wants more slow time together.",
      self: { q1: "SHOULD NOT BE RENDERED" },
    },
  },
};

// ---- paired_qa fixtures ----

export const pairedQaTwoPass: CoupleStep = {
  widget: "paired_qa",
  id: "pq-two-pass",
  title: "What each of you carries",
  selfIntro: "Answer for yourself first. No editing for the other person.",
  partnerReadIntro: "Now your read on {other_first_name}. A guess is fine.",
  questions: [
    { key: "q1", self: "What makes you feel close?", read: "What do you think makes {other_first_name} feel close?" },
    { key: "q2", self: "What pulls you away?", read: "What do you think pulls {other_first_name} away?" },
    { key: "q3", self: "Pick the image that fits this week.", read: "Pick the image you think {other_first_name} chose.", type: "image_select" },
  ],
};

export const pairedQaSubfields: CoupleStep = {
  widget: "paired_qa",
  id: "pq-subfields",
  title: "The four corners",
  innerWidget: "textarea",
  subfields: ["money", "time", "family", "rest"],
  subfieldLabels: {
    money: "Money, honestly",
    time: "Time with {other_first_name}",
    family: "Family and the people around you",
    rest: "Rest",
  },
  prefilledFrom: { money: "ptp.finance_reflection" },
};

export const pairedQaDualRater: CoupleStep = {
  widget: "paired_qa",
  id: "pq-dual",
  title: "How fair does it feel?",
  dualRater: true,
};

export const pairedQaRevealOnly: CoupleStep = {
  widget: "paired_qa",
  id: "pq-reveal",
  title: "The reveal",
  barrier: "both_partners_complete",
  reveal: { mode: "side_by_side", order: "alternating", toneRule: "neutral" },
};

// ---- couple_agreement fixtures ----

export const agreementStarters: CoupleStep = {
  widget: "couple_agreement",
  id: "ag-starters",
  title: "Three things you'll both hold",
  starters: [
    "No phones at dinner.",
    "We say the hard thing within a day.",
    "Sunday morning is ours.",
    "Either of us can call a pause.",
    "We don't argue past midnight.",
  ],
  selectCount: 3,
  allowCustom: true,
  bothMustAgree: true,
  requiredToComplete: true,
};

export const agreementFullRequirements: CoupleStep = {
  widget: "couple_agreement",
  id: "ag-full",
  title: "The boundary and what happens when it's crossed",
  starters: ["We don't raise our voices.", "We don't bring in family."],
  selectCount: 2,
  allowCustom: true,
  bothMustAgree: true,
  requiresEscalationPlan: true,
  requiresRainCheck: true,
  requiresWords: true,
  requiresDate: true,
  requiredToComplete: true,
};

export const agreementOutcomes: CoupleStep = {
  widget: "couple_agreement",
  id: "ag-outcomes",
  title: "Are you choosing this?",
  starters: ["We start couples counselling.", "We take the trip."],
  selectCount: 1,
  allowNotNow: true,
  allowNeedToKnowFirst: true,
  bothMustAgree: true,
};

// ---- joint_session fixtures ----

export const jointTurns: CoupleStep = {
  widget: "joint_session",
  id: "js-turns",
  title: "Twenty minutes, out loud",
  listenerRule: "The listener's only job is to understand, not to correct.",
  noInterruption: true,
  coachInterjection: false,
  rebuttalBox: false,
  turns: [
    { key: "t1", prompt: "Say what this year has been like for you.", speaker: "a", listenerReflects: true },
    { key: "t2", prompt: "Say what this year has been like for you.", speaker: "b", listenerReflects: true },
    { key: "t3", prompt: "Together: name one thing you'd both keep.", speaker: "both" },
  ],
};

export const jointScaffold: CoupleStep = {
  widget: "joint_session",
  id: "js-scaffold",
  title: "How to run the conversation",
  presentOnly: true,
  listenerRule: "One speaks, one listens. Then swap.",
  sessionScaffold: [
    "Sit somewhere without a screen between you.",
    "Set twenty minutes on a timer.",
    "{other_first_name} speaks first for five minutes.",
    "Swap, without responding to what was said.",
    "Finish by naming one thing you each heard.",
  ],
};

export const jointBare: CoupleStep = {
  widget: "joint_session",
  id: "js-bare",
  title: "The conversation about the house",
  listenerRule: "No decisions tonight.",
  optIn: true,
  coachInterjection: false,
};
