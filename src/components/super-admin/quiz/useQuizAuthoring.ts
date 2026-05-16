import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function mapQuizRpcError(error: any): string {
  const msg: string = error?.message ?? "";
  if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
  if (msg.includes("invalid_question_type")) return "Question type is not supported.";
  if (msg.includes("question_text_required")) return "Question text is required.";
  if (msg.includes("parent_item_not_quiz")) return "This content item is not a quiz.";
  if (msg.includes("content_item_archived")) return "This quiz is archived. Restore it first.";
  if (msg.includes("content_item_id_mismatch")) return "Cannot move a question between content items.";
  if (msg.includes("option_text_or_image_required")) return "Each option must have text.";
  if (msg.includes("match_pair_key_required"))
    return "Matching questions require a pair key for each option (this is a code bug — please report).";
  if (msg.includes("ordered_ids_count_mismatch"))
    return "The reorder list does not match the number of questions.";
  if (msg.includes("ordered_ids_invalid"))
    return "The reorder list includes invalid or archived question ids.";
  if (msg.includes("quiz_question_not_found") || msg.includes("quiz_answer_option_not_found"))
    return "Item not found — it may have been archived.";
  if (msg.includes("already_archived")) return "This item is already archived.";
  if (msg.includes("IMPERSONATION_DENIED"))
    return "This action is blocked while impersonating, even in act mode.";
  return msg || "Could not save changes.";
}

function pickId(result: any, fallback: string | null): string | null {
  if (!result) return fallback;
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    return (
      (result.id as string | undefined) ??
      (result.question_id as string | undefined) ??
      (result.option_id as string | undefined) ??
      fallback
    );
  }
  return fallback;
}

export interface UpsertQuestionParams {
  id: string | null;
  content_item_id: string;
  question_type: string;
  question_text: string;
  display_order: number;
  points: number;
  explanation: string | null;
  reason: string;
}

export interface UpsertOptionParams {
  id: string | null;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  match_pair_key: string | null;
  display_order: number;
  reason: string;
}

export function useQuizAuthoring() {
  const upsertQuestion = useCallback(async (p: UpsertQuestionParams): Promise<string> => {
    const { data, error } = await supabase.rpc("upsert_quiz_question", {
      p_id: p.id as any,
      p_content_item_id: p.content_item_id,
      p_question_type: p.question_type,
      p_question_text: p.question_text,
      p_question_image_url: null as any,
      p_display_order: p.display_order,
      p_points: p.points,
      p_explanation: p.explanation as any,
      p_reason: p.reason,
    });
    if (error) throw error;
    const id = pickId(data, p.id);
    if (!id) throw new Error("upsert_quiz_question returned no id");
    return id;
  }, []);

  const archiveQuestion = useCallback(async (id: string, reason: string) => {
    const { error } = await supabase.rpc("archive_quiz_question", { p_id: id, p_reason: reason });
    if (error) throw error;
  }, []);

  const reorderQuestions = useCallback(
    async (contentItemId: string, orderedIds: string[], reason: string) => {
      const { error } = await supabase.rpc("reorder_quiz_questions", {
        p_content_item_id: contentItemId,
        p_ordered_ids: orderedIds,
        p_reason: reason,
      });
      if (error) throw error;
    },
    []
  );

  const upsertOption = useCallback(async (p: UpsertOptionParams): Promise<string> => {
    const { data, error } = await supabase.rpc("upsert_quiz_answer_option", {
      p_id: p.id as any,
      p_question_id: p.question_id,
      p_option_text: p.option_text,
      p_option_image_url: null as any,
      p_is_correct: p.is_correct,
      p_match_pair_key: p.match_pair_key as any,
      p_display_order: p.display_order,
      p_reason: p.reason,
    });
    if (error) throw error;
    const id = pickId(data, p.id);
    if (!id) throw new Error("upsert_quiz_answer_option returned no id");
    return id;
  }, []);

  const archiveOption = useCallback(async (id: string, reason: string) => {
    const { error } = await supabase.rpc("archive_quiz_answer_option", {
      p_id: id,
      p_reason: reason,
    });
    if (error) throw error;
  }, []);

  return { upsertQuestion, archiveQuestion, reorderQuestions, upsertOption, archiveOption };
}
