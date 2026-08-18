import { supabase } from "@/integrations/supabase/client";

export interface WalkthroughStepMeta {
  id: string;
  title: string | null;
  metered: boolean;
}

export interface WalkthroughOffer {
  offer: boolean;
  resume_session_id: string | null;
  free_walkthrough_used: boolean;
  declined_count: number;
  steps: WalkthroughStepMeta[];
}

export interface WalkthroughMsg {
  role: "user" | "assistant";
  content: string;
}

/**
 * Maps the backend's `report_section` tokens onto the DOM ids added to
 * MyResults.tsx. The step -> section mapping itself comes from the active
 * walkthrough definition; only this token -> element id table lives here.
 */
export const SECTION_ELEMENT_IDS: Record<string, string> = {
  onepager: "ptp-section-onepagers",
  dimension_scores: "ptp-section-dimension-scores",
  profile_overview: "ptp-section-profile-overview",
  personal_summary: "ptp-section-profile-overview",
  action_plan: "ptp-section-profile-overview",
  dimension_highlights: "ptp-section-dimension-highlights",
  driving_facets: "ptp-section-driving-facets",
  facet_insights_all: "ptp-section-facet-insights",
  facet_insights: "ptp-section-facet-insights",
  full_facet_charts: "ptp-section-full-facets",
  assessment_responses: "ptp-section-responses",
};

export const PTP_SECTION_REVEAL_EVENT = "ptp-walkthrough:reveal";

export type SectionRevealDetail = {
  /** report_section token, e.g. "onepager" */
  token: string;
  /** one-pagers only: work | therapist | partner | friend */
  audience?: string;
};

export function requestSectionReveal(detail: SectionRevealDetail): void {
  window.dispatchEvent(
    new CustomEvent<SectionRevealDetail>(PTP_SECTION_REVEAL_EVENT, { detail }),
  );
}

/** Subscribe to reveal requests for one token. Returns an unsubscribe fn. */
export function onSectionReveal(
  token: string,
  handler: (detail: SectionRevealDetail) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<SectionRevealDetail>).detail;
    if (!detail?.token) return;
    const parts = detail.token.split(",").map((t) => t.trim());
    if (!parts.includes(token)) return;
    handler(detail);
  };
  window.addEventListener(PTP_SECTION_REVEAL_EVENT, listener);
  return () => window.removeEventListener(PTP_SECTION_REVEAL_EVENT, listener);
}

export function focusReportSection(reportSection: string | null | undefined) {
  if (!reportSection) return;
  const tokens = reportSection
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return;

  // Ask every named section to open itself first.
  tokens.forEach((t) => {
    if (!SECTION_ELEMENT_IDS[t]) {
      console.warn("[ptp-walkthrough] unmapped report_section token", t);
    }
    requestSectionReveal({ token: t });
  });

  // Let a newly expanded section settle before measuring where to scroll.
  window.setTimeout(() => {
    let el: HTMLElement | null = null;
    for (const t of tokens) {
      const elId = SECTION_ELEMENT_IDS[t];
      if (!elId) continue;
      const candidate = document.getElementById(elId);
      if (candidate) {
        el = candidate;
        break;
      }
      console.warn("[ptp-walkthrough] no element for section id", elId, "token", t);
    }
    if (!el) {
      console.warn("[ptp-walkthrough] nothing to scroll to for", reportSection);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ptp-walkthrough-focus");
    window.setTimeout(() => el!.classList.remove("ptp-walkthrough-focus"), 2000);
  }, 120);
}


/** step id -> report_section token string, straight from the active definition. */
export async function fetchStepSections(): Promise<Record<string, string | null>> {
  const { data, error } = await supabase.rpc("bw_walkthrough_active_definition" as never);
  if (error) {
    console.error("[ptp-walkthrough] bw_walkthrough_active_definition failed", error);
    return {};
  }
  const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
  const steps = (row?.steps ?? []) as any[];
  const out: Record<string, string | null> = {};
  for (const s of steps) out[s.id] = s.report_section ?? null;
  return out;
}

/**
 * Rebuilds the transcript the server already stored for a session. The server
 * writes one object per step id into `responses`; we take whatever array of
 * {role, content} it holds, in definition order.
 */
export async function fetchServerTranscript(
  sessionId: string,
  stepOrder: string[],
): Promise<{ messages: WalkthroughMsg[]; currentStep: string | null }> {
  const { data, error } = await supabase
    .from("ptp_walkthrough_sessions")
    .select("current_step, responses")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return { messages: [], currentStep: null };

  const responses = (data.responses ?? {}) as Record<string, any>;
  const keys = stepOrder.length ? stepOrder : Object.keys(responses);
  const messages: WalkthroughMsg[] = [];
  for (const key of keys) {
    const bucket = responses[key];
    if (!bucket || typeof bucket !== "object") continue;
    const arr =
      bucket.messages ?? bucket.turns ?? bucket.exchanges ?? bucket.transcript ?? null;
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      if (!m || typeof m.content !== "string") continue;
      if (m.role !== "user" && m.role !== "assistant") continue;
      messages.push({ role: m.role, content: m.content });
    }
  }
  return { messages, currentStep: (data.current_step as string) ?? null };
}

export interface WalkthroughError {
  code: string | null;
  status: number | null;
  message: string | null;
}

export function readWalkthroughError(error: unknown, data: unknown): WalkthroughError | null {
  const status = (error as any)?.context?.status ?? null;
  const code = (data as any)?.error ?? null;
  const serverMessage = (data as any)?.message ?? null;
  if (!error && !code) return null;
  return { code, status, message: serverMessage };
}

/** Participant-facing copy for every failure the backend can return. */
export function walkthroughErrorCopy(e: WalkthroughError): string {
  if (e.code === "walkthrough_budget_exhausted" || e.code === "account_allowance_exhausted") {
    return (
      e.message ??
      "That's a good place to finish. Your report stays here for you to come back to whenever you like."
    );
  }
  if (e.code === "free_walkthrough_already_used") {
    return "You've already used the walkthrough included with this report.";
  }
  if (e.code === "no_responses_on_result") {
    return "This report doesn't have answers attached to it yet.";
  }
  if (e.status === 402) {
    return "You have no AI messages remaining. Your practitioner can help, or you can upgrade for more.";
  }
  if (e.status === 403) return "You do not have access to this report.";
  if (e.status === 404) return "We couldn't find this report.";
  return "Something went wrong. Please try again.";
}

export function isGracefulEnd(e: WalkthroughError): boolean {
  return (
    e.code === "walkthrough_budget_exhausted" ||
    e.code === "account_allowance_exhausted" ||
    e.code === "free_walkthrough_already_used"
  );
}
