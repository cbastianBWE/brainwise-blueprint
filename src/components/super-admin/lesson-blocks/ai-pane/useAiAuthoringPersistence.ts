import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AiMode,
  AiStage,
  ChatMessage,
  FullContentState,
  OutlineState,
} from "./types";

type Status = "idle" | "saving" | "saved" | "error";

function normalizeForCompare(v: any): any {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    return v.map(normalizeForCompare).filter((x) => x !== undefined);
  }
  if (typeof v === "object") {
    const out: any = {};
    for (const k of Object.keys(v).sort()) {
      const nv = normalizeForCompare(v[k]);
      if (nv === undefined) continue;
      if (Array.isArray(nv) && nv.length === 0) continue;
      if (nv === null || nv === "") continue;
      out[k] = nv;
    }
    return out;
  }
  return v;
}

export type PersistenceState = {
  stage: AiStage;
  mode: AiMode;
  messages: ChatMessage[];
  outlineState: OutlineState | null;
  fullContentState: FullContentState | null;
  attachedDocumentIds: string[];
  voicePresetKey: string | null;
  customVoiceGuidance: string | null;
  customVoiceExample: string | null;
};

export function useAiAuthoringPersistence(args: {
  contentItemId: string;
  state: PersistenceState;
  enabled: boolean;
}): {
  status: Status;
  lastSavedAt: Date | null;
  pause: () => void;
  resume: () => void;
  flushNow: () => Promise<void>;
} {
  const { contentItemId, state, enabled } = args;
  const [status, setStatus] = useState<Status>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const prevSerialized = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const doSave = useCallback(async () => {
    setStatus("saving");
    const s = stateRef.current;
    try {
      const { error } = await supabase.rpc("upsert_ai_authoring_conversation", {
        p_content_item_id: contentItemId,
        p_stage: s.stage,
        p_mode: s.mode,
        p_messages: s.messages as any,
        p_outline_state: (s.outlineState ?? null) as any,
        p_full_content_state: (s.fullContentState ?? null) as any,
        p_attached_document_ids: s.attachedDocumentIds,
        p_voice_preset_key: s.voicePresetKey as any,
        p_custom_voice_guidance: s.customVoiceGuidance as any,
        p_custom_voice_example: s.customVoiceExample as any,
      });
      if (error) throw error;
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("upsert_ai_authoring_conversation failed", e);
      setStatus("error");
    }
  }, [contentItemId]);

  useEffect(() => {
    if (!enabled) return;
    if (pausedRef.current) return;
    const serialized = JSON.stringify(normalizeForCompare(state));
    if (prevSerialized.current === null) {
      prevSerialized.current = serialized;
      return;
    }
    if (serialized === prevSerialized.current) return;
    prevSerialized.current = serialized;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pausedRef.current) return;
      void doSave();
    }, 2000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, enabled, doSave]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    prevSerialized.current = null;
  }, []);

  const flushNow = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await doSave();
  }, [doSave]);

  return { status, lastSavedAt, pause, resume, flushNow };
}
