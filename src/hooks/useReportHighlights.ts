import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReportHighlight {
  id: string; block_key: string; context_tab?: string;
  start_offset: number; end_offset: number;
  block_text_sha: string; quoted_text: string; color: string | null;
  note: string | null;
}

export function useReportHighlights(assessmentResultId: string | undefined, contextTab: string, enabled: boolean) {
  const [byBlock, setByBlock] = useState<Record<string, ReportHighlight[]>>({});

  const reload = useCallback(async () => {
    if (!enabled || !assessmentResultId) { setByBlock({}); return; }
    const { data } = await supabase
      .from("ptp_report_highlights")
      .select("id, block_key, context_tab, start_offset, end_offset, block_text_sha, quoted_text, color, note")
      .eq("assessment_result_id", assessmentResultId)
      .eq("context_tab", contextTab);
    const map: Record<string, ReportHighlight[]> = {};
    (data ?? []).forEach((h) => { (map[h.block_key] ??= []).push(h as ReportHighlight); });
    setByBlock(map);
  }, [assessmentResultId, contextTab, enabled]);

  useEffect(() => { reload(); }, [reload]);

  const addHighlight = useCallback(async (a: { blockKey: string; start: number; end: number; sha: string; quoted: string; color: string; note?: string | null }) => {
    if (!assessmentResultId) return;
    const { data: u } = await supabase.auth.getUser();
    const viewerId = u.user?.id;
    if (!viewerId) return;
    await supabase.from("ptp_report_highlights").insert({
      viewer_user_id: viewerId, assessment_result_id: assessmentResultId, context_tab: contextTab,
      block_key: a.blockKey, start_offset: a.start, end_offset: a.end,
      block_text_sha: a.sha, quoted_text: a.quoted, color: a.color,
      note: a.note ?? null,
    });
    reload();
  }, [assessmentResultId, contextTab, reload]);

  const updateHighlightNote = useCallback(async (id: string, note: string | null) => {
    await supabase.from("ptp_report_highlights").update({ note }).eq("id", id);
    reload();
  }, [reload]);

  const removeHighlight = useCallback(async (id: string) => {
    await supabase.from("ptp_report_highlights").delete().eq("id", id);
    reload();
  }, [reload]);

  return { byBlock, addHighlight, updateHighlightNote, removeHighlight, enabled };
}
