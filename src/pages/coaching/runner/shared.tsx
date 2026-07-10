// Shared types and helpers extracted verbatim from CoachingActivityRunner.tsx (Stage A1).
// Behavior-preserving move — do not add logic here.

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MMValue } from "@/components/coaching/MultimodalField";

// ---- Types ----
export interface Step {
  widget: string;
  key?: string;
  min?: number;
  subfields?: string[];
  chat?: boolean;
  label?: string;
  title?: string;
  helper?: string;
  placeholder?: string;
  addLabel?: string;
  variant?: string;
  onComplete?: { touchpoint?: string };
  // image_select
  intro?: string;
  source?: { library?: string };
  pageSize?: number;
  selectMin?: number;
  softCap?: number;
  tagOnSelect?: { prompt?: string; maxLen?: number };
  overCapNudge?: string;
  // content
  body?: string;
  media?: { type: string; src: string; alt?: string; caption?: string };
  statements?: string[];
  resources?: { id: string; title?: string }[];
  beats?: { group: string; label: string; body: string }[];
  reflection?: { prompt?: string; placeholder?: string; optional?: boolean; minRows?: number };
  // image_describe
  fromKey?: string;
  questions?: any;
  // qa_multimodal
  modes?: string[];
  allowSkip?: boolean;
  descriptionPrompt?: string;
  minDescribed?: number;
  subfieldLabels?: Record<string, string>;
  subfieldHelpers?: Record<string, string>;
  subfieldTypes?: Record<string, string>;
  subfieldOptions?: Record<string, string[]>;
  // text_select
  selectExactly?: number;
  reflectOnSelect?: { modal?: boolean; prompt?: string; maxLen?: number };
  // ai suggestions
  suggest?: { mode: "auto" | "on_demand"; count?: number; buttonLabel?: string; prompt?: string };
  // list_builder soft nudge + prioritize pass
  softTarget?: number;
  prioritize?: {
    selectExactly: number;
    title?: string;
    prompt?: string;
    helper?: string;
    priorityKey: string;
  };
  // ikigai
  lenses?: Array<{ key: string; storeKey: string; label: string; prompt?: string }>;
  mapAction?: { label?: string; touchpoint?: string; function?: string };
  override?: { mode?: string; storeKey?: string };
  mapKey?: string;
  regionLabels?: Record<string, string>;
  lensKeys?: Record<string, string>;
  // ptp_display
  instrument?: string;
  // assessment_upload
  accept?: string[];
  bucket?: string;
  uploadsTable?: string;
  analysisKey?: string;
  suggestions?: string[];
  // inner_team
  charactersKey?: string;
  elicitKey?: string;
  suggestAction?: { label?: string; touchpoint?: string; function?: string };
  layerLabels?: Record<string, string>;
  powerLabels?: Record<string, string>;
  attributeLabels?: Record<string, string>;
  // scored_factors
  factors?: Array<{ key: string; label: string; side?: string; helper?: string }>;
  sides?: Array<{ key: string; label: string; goal?: string }>;
  scale?: { min?: number; max?: number };
}

export interface SelectedSaying {
  saying_id: string;
  text: string;
  author: string | null;
  description: MMValue;
}

export interface Activity {
  id: string;
  code?: string | null;
  title: string;
  tier: string | null;
  definition: any;
}

export interface Negative {
  text: MMValue;
  a?: MMValue;
  b?: MMValue;
  c?: MMValue;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface Responses {
  action?: string;
  positives?: string[];
  positiveAction?: string;
  negatives?: Negative[];
  analysis?: { html?: string; [k: string]: unknown };
  chat?: ChatMsg[];
  [k: string]: unknown;
}

export interface Session {
  id: string;
  activity_id: string;
  status: string;
  current_step: number;
  responses: Responses;
  parent_session_id: string | null;
  completed_at: string | null;
}

export interface LibraryImage {
  id: string;
  storage_path: string;
  alt: string | null;
}

export interface SelectedImage {
  library_id: string;
  storage_path: string;
  tag: string;
  description?: MMValue;
}

export interface SayingRow {
  id: string;
  text: string;
  author: string | null;
}

export type QaAnswer = {
  mode: "text" | "dictate" | "audio" | "video";
  text?: string;
  media_id?: string;
  skipped?: boolean;
};

export type AssessmentFileType = "pdf" | "image" | "docx";

export interface AssessmentUploadRow {
  id: string;
  label: string;
  file_type: AssessmentFileType;
  original_filename: string;
  storage_path: string;
}

// ---- Helpers ----
export function buildUserPatch(responses: Responses): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(responses)) {
    if (k === "analysis" || k === "chat" || k === "recap" || k === "assessment_analysis") continue;
    patch[k] = (responses as any)[k];
  }
  return patch;
}

export function useDebouncedSave(sessionId: string | null, current_step: number, responses: Responses) {
  const timer = useRef<number | null>(null);
  const pending = useRef<{ step: number; patch: Record<string, unknown> } | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  useEffect(() => {
    if (!sessionId) return;
    if (timer.current) window.clearTimeout(timer.current);
    const patch = buildUserPatch(responses);
    pending.current = { step: current_step, patch };
    timer.current = window.setTimeout(async () => {
      pending.current = null;
      await supabase.rpc("coaching_session_save", {
        p_session_id: sessionId,
        p_current_step: current_step,
        p_patch: patch as any,
      });
    }, 600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      const p = pending.current;
      const sid = sessionIdRef.current;
      if (p && sid) {
        pending.current = null;
        void supabase.rpc("coaching_session_save", {
          p_session_id: sid,
          p_current_step: p.step,
          p_patch: p.patch as any,
        });
      }
    };
  }, [sessionId, current_step, JSON.stringify(responses)]);
}

export const imgUrl = (path: string, w: number, h: number) =>
  supabase.storage
    .from("coaching-media")
    .getPublicUrl(path, { transform: { width: w, height: h, resize: "cover" } }).data.publicUrl;

export function humanizeBand(band: string | undefined | null, mean?: number | null): string {
  if (!band && typeof mean === "number") {
    if (mean >= 70) return "High";
    if (mean >= 40) return "Moderate";
    return "Low";
  }
  if (!band) return "—";
  return band.replace(/_/g, "–").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function inferFileType(file: File, accept: string[]): AssessmentFileType | null {
  const name = file.name.toLowerCase();
  if (accept.includes("pdf") && (file.type === "application/pdf" || name.endsWith(".pdf"))) return "pdf";
  if (accept.includes("image") && file.type.startsWith("image/")) return "image";
  if (accept.includes("docx") && (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) return "docx";
  return null;
}

export function extForFile(file: File, type: AssessmentFileType): string {
  const m = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (m) return m[1];
  if (type === "pdf") return "pdf";
  if (type === "docx") return "docx";
  return "bin";
}
