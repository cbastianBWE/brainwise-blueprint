import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EditorBlock } from "./blockTypeMeta";

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

function stableSerialize(blocks: EditorBlock[]): string {
  return JSON.stringify(normalizeForCompare(blocks));
}

export function useLessonBlockDraft(args: {
  contentItemId: string;
  blocks: EditorBlock[];
  enabled: boolean;
}): {
  status: Status;
  lastSavedAt: Date | null;
  pause: () => void;
  resume: () => void;
} {
  const { contentItemId, blocks, enabled } = args;
  const [status, setStatus] = useState<Status>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const prevSerialized = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (pausedRef.current) return;
    const serialized = JSON.stringify(blocks);
    if (prevSerialized.current === null) {
      prevSerialized.current = serialized;
      return;
    }
    if (serialized === prevSerialized.current) return;
    prevSerialized.current = serialized;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (pausedRef.current) return;
      setStatus("saving");
      try {
        const { error } = await supabase.rpc("save_lesson_block_draft" as any, {
          p_content_item_id: contentItemId,
          p_draft_json: { blocks },
        });
        if (error) throw error;
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("save_lesson_block_draft failed", e);
        setStatus("error");
      }
    }, 3000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [blocks, enabled, contentItemId]);

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
    // Reset baseline so we don't immediately fire a save for changes
    // that happened while paused (server is now canonical).
    prevSerialized.current = null;
  }, []);

  return { status, lastSavedAt, pause, resume };
}
