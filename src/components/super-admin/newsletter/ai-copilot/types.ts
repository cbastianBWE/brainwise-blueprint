export type ModelKey = "opus" | "sonnet";

export interface SelectionRange {
  from: number;
  to: number;
  html_snippet: string;
}

export interface MessageAttachment {
  kind: "pdf" | "docx" | "txt" | "md";
  name: string;
  storage_path: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated_html: string | null;
  model_used: string | null;
  created_at: string;
  status: "persisted" | "pending" | "failed";
  selection_range: SelectionRange | null;
  attachments: MessageAttachment[];
}

export interface NewsletterAiGenerateResponse {
  conversation_id: string;
  assistant_message: { content: string };
  generated_html: string | null;
  model_used: string | null;
}

const HTML_FENCE_RE = /```html\s*\n([\s\S]*?)\n```/i;

/**
 * Mirrors the Edge Function's extractFirstHtmlBlock. Returns the first
 * fenced ```html block's contents trimmed, or null.
 */
export function extractHtmlBlock(content: string): string | null {
  if (!content) return null;
  const m = content.match(HTML_FENCE_RE);
  if (!m || !m[1]) return null;
  const inner = m[1].trim();
  return inner.length > 0 ? inner : null;
}
