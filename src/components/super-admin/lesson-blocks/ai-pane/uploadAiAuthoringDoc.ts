import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://svprhtzawnbzmumxnhsq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cHJodHphd25iem11bXhuaHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MDQsImV4cCI6MjA5MTI1MzYwNH0.R9WzFR4olqp1tdWa-pj-2WSL2L0Mjcf2tSA8LhOWclA";

export type UploadAiAuthoringDocResponse = {
  success: boolean;
  document: {
    id: string;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    extracted_text_token_count: number;
    uploaded_at: string;
    expires_at: string;
  };
  pages_or_slides?: number;
  was_truncated?: boolean;
  conversation_tokens_after_upload?: number;
  conversation_tokens_remaining?: number;
};

export async function uploadAiAuthoringDoc(args: {
  contentItemId: string;
  file: File;
}): Promise<UploadAiAuthoringDocResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw { error: "not_authenticated", message: "You must be signed in to upload." };
  }

  const fd = new FormData();
  fd.append("content_item_id", args.contentItemId);
  fd.append("file", args.file);

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/upload-ai-authoring-doc`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        // Important: do NOT set Content-Type — the browser must set the multipart boundary.
      },
      body: fd,
    },
  );

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw { status: res.status, ...json };
  }
  return json as UploadAiAuthoringDocResponse;
}
