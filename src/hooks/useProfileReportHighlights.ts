import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportHighlight } from "@/hooks/useReportHighlights";

export function usePairedReportHighlights(pairedProfileId: string | undefined, enabled: boolean) {
  const [byBlock, setByBlock] = useState<Record<string, ReportHighlight[]>>({});
  const reload = useCallback(async () => {
    if (!enabled || !pairedProfileId) { setByBlock({}); return; }
    const { data } = await (supabase as any)
      .from("paired_report_highlights")
      .select("id, block_key, start_offset, end_offset, block_text_sha, quoted_text, color, note")
      .eq("paired_profile_id", pairedProfileId);
    const map: Record<string, ReportHighlight[]> = {};
    (data ?? []).forEach((h: any) => { (map[h.block_key] ??= []).push(h as ReportHighlight); });
    setByBlock(map);
  }, [pairedProfileId, enabled]);
  useEffect(() => { reload(); }, [reload]);
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
  return { byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled };
}

export function useTeamReportHighlights(teamProfileId: string | undefined, enabled: boolean) {
  const [byBlock, setByBlock] = useState<Record<string, ReportHighlight[]>>({});
  const reload = useCallback(async () => {
    if (!enabled || !teamProfileId) { setByBlock({}); return; }
    const { data } = await (supabase as any)
      .from("team_report_highlights")
      .select("id, block_key, start_offset, end_offset, block_text_sha, quoted_text, color, note")
      .eq("team_profile_id", teamProfileId);
    const map: Record<string, ReportHighlight[]> = {};
    (data ?? []).forEach((h: any) => { (map[h.block_key] ??= []).push(h as ReportHighlight); });
    setByBlock(map);
  }, [teamProfileId, enabled]);
  useEffect(() => { reload(); }, [reload]);
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
  return { byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled };
}
