export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export type OutlineItem = {
  id: string;
  block_type: string;
  summary_one_line: string;
  learning_objective_fragment: string;
};

export type OutlineState = { items: OutlineItem[] };

export type FullContentItem = {
  id: string;
  block_type: string;
  config: Record<string, unknown>;
};

export type FullContentState = { blocks: FullContentItem[] };

export type AiStage = "chat" | "outline" | "full_content" | "built";
export type AiMode = "fresh" | "append" | "replace";

export type ConversationRow = {
  out_id: string;
  out_stage: AiStage;
  out_mode: AiMode;
  out_messages: ChatMessage[];
  out_outline_state: OutlineState | null;
  out_full_content_state: FullContentState | null;
  out_attached_document_ids: string[];
  out_voice_preset_key: string | null;
  out_custom_voice_guidance: string | null;
  out_custom_voice_example: string | null;
  out_created_at: string;
  out_updated_at: string;
};

export type SessionDocument = {
  out_id: string;
  out_file_name: string;
  out_file_size_bytes: number;
  out_mime_type: string;
  out_extracted_text_token_count: number;
  out_uploaded_at: string;
  out_last_accessed_at: string;
  out_expires_at: string;
};

export type VoicePreset = {
  preset_key: string;
  display_name: string;
  display_order: number;
};

export const TOKEN_BUDGET = 150_000;
