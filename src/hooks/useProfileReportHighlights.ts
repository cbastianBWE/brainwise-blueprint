import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportHighlight } from "@/hooks/useReportHighlights";

export function usePairedReportHighlights(pairedProfileId: string | undefined, enabled: boolean) {
  const [byBlock, setByBlock] = useState<Record<string, ReportHighlight[]>>({});
  const [orphans, setOrphans] = useState<ReportHighlight[]>([]);
  const seenBlocks = useRef<Set<string>>(new Set());
  const resolvedIds = useRef<Set<string>>(new Set());
  const settleTimer = useRef<number | null>(null);
  const byBlockRef = useRef<Record<string, ReportHighlight[]>>({});
  useEffect(() => { byBlockRef.current = byBlock; }, [byBlock]);

  const reload = useCallback(async () => {
    if (!enabled || !pairedProfileId) {
      seenBlocks.current = new Set();
      resolvedIds.current = new Set();
      setOrphans([]);
      setByBlock({});
      return;
    }
    const { data } = await (supabase as any)
      .from("paired_report_highlights")
      .select("id, block_key, start_offset, end_offset, block_text_sha, quoted_text, color, note")
      .eq("paired_profile_id", pairedProfileId);
    const map: Record<string, ReportHighlight[]> = {};
    (data ?? []).forEach((h: any) => { (map[h.block_key] ??= []).push(h as ReportHighlight); });
    seenBlocks.current = new Set();
    resolvedIds.current = new Set();
    setOrphans([]);
    setByBlock(map);
  }, [pairedProfileId, enabled]);
  useEffect(() => { reload(); }, [reload]);

  // Called by each rendered block once it knows which of its stored
  // highlights it managed to place. Refs, not state, so hundreds of blocks
  // reporting cannot trigger a render storm.
  const reportBlockResolved = useCallback((blockKey: string, ids: string[]) => {
    seenBlocks.current.add(blockKey);
    ids.forEach((id) => resolvedIds.current.add(id));
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setOrphans((prev) => {
        const out: ReportHighlight[] = [];
        for (const [key, list] of Object.entries(byBlockRef.current)) {
          if (!seenBlocks.current.has(key)) continue;
          for (const h of list) {
            if (!resolvedIds.current.has(h.id)) out.push(h);
          }
        }
        if (prev.length === out.length && prev.every((p, i) => p.id === out[i].id)) {
          return prev;
        }
        return out;
      });
    }, 400);
  }, []);

  useEffect(() => () => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
  }, []);

  const addHighlight = useCallback(async (a: { blockKey: string; start: number; end: number; sha: string; quoted: string; color: string; note?: string | null }) => {
    if (!pairedProfileId) return;
    const { data: u } = await supabase.auth.getUser();
    const viewerId = u.user?.id; if (!viewerId) return;
    await (supabase as any).from("paired_report_highlights").insert({
      viewer_user_id: viewerId, paired_profile_id: pairedProfileId,
      block_key: a.blockKey, start_offset: a.start, end_offset: a.end,
      block_text_sha: a.sha, quoted_text: a.quoted, color: a.color, note: a.note ?? null,
    });
    reload();
  }, [pairedProfileId, reload]);
  const updateHighlightNote = useCallback(async (id: string, note: string | null) => {
    await (supabase as any).from("paired_report_highlights").update({ note }).eq("id", id); reload();
  }, [reload]);
  const removeHighlight = useCallback(async (id: string) => {
    await (supabase as any).from("paired_report_highlights").delete().eq("id", id); reload();
  }, [reload]);
  return useMemo(
    () => ({ byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled, orphans, reportBlockResolved }),
    [byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled, orphans, reportBlockResolved],
  );
}

export function useTeamReportHighlights(teamProfileId: string | undefined, enabled: boolean) {
  const [byBlock, setByBlock] = useState<Record<string, ReportHighlight[]>>({});
  const [orphans, setOrphans] = useState<ReportHighlight[]>([]);
  const seenBlocks = useRef<Set<string>>(new Set());
  const resolvedIds = useRef<Set<string>>(new Set());
  const settleTimer = useRef<number | null>(null);
  const byBlockRef = useRef<Record<string, ReportHighlight[]>>({});
  useEffect(() => { byBlockRef.current = byBlock; }, [byBlock]);

  const reload = useCallback(async () => {
    if (!enabled || !teamProfileId) {
      seenBlocks.current = new Set();
      resolvedIds.current = new Set();
      setOrphans([]);
      setByBlock({});
      return;
    }
    const { data } = await (supabase as any)
      .from("team_report_highlights")
      .select("id, block_key, start_offset, end_offset, block_text_sha, quoted_text, color, note")
      .eq("team_profile_id", teamProfileId);
    const map: Record<string, ReportHighlight[]> = {};
    (data ?? []).forEach((h: any) => { (map[h.block_key] ??= []).push(h as ReportHighlight); });
    seenBlocks.current = new Set();
    resolvedIds.current = new Set();
    setOrphans([]);
    setByBlock(map);
  }, [teamProfileId, enabled]);
  useEffect(() => { reload(); }, [reload]);

  const reportBlockResolved = useCallback((blockKey: string, ids: string[]) => {
    seenBlocks.current.add(blockKey);
    ids.forEach((id) => resolvedIds.current.add(id));
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setOrphans((prev) => {
        const out: ReportHighlight[] = [];
        for (const [key, list] of Object.entries(byBlockRef.current)) {
          if (!seenBlocks.current.has(key)) continue;
          for (const h of list) {
            if (!resolvedIds.current.has(h.id)) out.push(h);
          }
        }
        if (prev.length === out.length && prev.every((p, i) => p.id === out[i].id)) {
          return prev;
        }
        return out;
      });
    }, 400);
  }, []);

  useEffect(() => () => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
  }, []);

  const addHighlight = useCallback(async (a: { blockKey: string; start: number; end: number; sha: string; quoted: string; color: string; note?: string | null }) => {
    if (!teamProfileId) return;
    const { data: u } = await supabase.auth.getUser();
    const viewerId = u.user?.id; if (!viewerId) return;
    await (supabase as any).from("team_report_highlights").insert({
      viewer_user_id: viewerId, team_profile_id: teamProfileId,
      block_key: a.blockKey, start_offset: a.start, end_offset: a.end,
      block_text_sha: a.sha, quoted_text: a.quoted, color: a.color, note: a.note ?? null,
    });
    reload();
  }, [teamProfileId, reload]);
  const updateHighlightNote = useCallback(async (id: string, note: string | null) => {
    await (supabase as any).from("team_report_highlights").update({ note }).eq("id", id); reload();
  }, [reload]);
  const removeHighlight = useCallback(async (id: string) => {
    await (supabase as any).from("team_report_highlights").delete().eq("id", id); reload();
  }, [reload]);
  return useMemo(
    () => ({ byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled, orphans, reportBlockResolved }),
    [byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled, orphans, reportBlockResolved],
  );
}
