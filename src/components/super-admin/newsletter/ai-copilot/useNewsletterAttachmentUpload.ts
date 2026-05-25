import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  extractText,
  inferKindFromFile,
  MAX_EXTRACTED_TEXT_PER_FILE,
  MAX_FILE_SIZE_BYTES,
  type AttachmentKind,
} from "./extractAttachmentText";

export type AttachmentStatus = "uploading" | "extracting" | "ready" | "failed";

export interface PendingAttachment {
  local_id: string;
  file_name: string;
  kind: AttachmentKind;
  size_bytes: number;
  status: AttachmentStatus;
  error?: string;
  storage_path?: string;
  extracted_text?: string;
}

interface Params {
  articleId: string;
  userId: string;
}

const BUCKET = "newsletter_ai_attachments";

export function useNewsletterAttachmentUpload({ articleId, userId }: Params) {
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!articleId || !userId) return;

      // Kick off all uploads in parallel.
      await Promise.all(
        files.map(async (file) => {
          const kind = inferKindFromFile(file);
          if (!kind) return; // UI should have filtered; ignore silently.

          if (file.size > MAX_FILE_SIZE_BYTES) {
            setPending((prev) => [
              ...prev,
              {
                local_id: crypto.randomUUID(),
                file_name: file.name,
                kind,
                size_bytes: file.size,
                status: "failed",
                error: "File exceeds 10 MB.",
              },
            ]);
            return;
          }

          const local_id = crypto.randomUUID();
          const ext = kind;
          const path = `${articleId}/${userId}/${local_id}.${ext}`;

          setPending((prev) => [
            ...prev,
            {
              local_id,
              file_name: file.name,
              kind,
              size_bytes: file.size,
              status: "uploading",
            },
          ]);

          try {
            const { error: uploadErr } = await supabase.storage
              .from(BUCKET)
              .upload(path, file, {
                upsert: false,
                contentType: file.type || undefined,
              });
            if (uploadErr) throw uploadErr;

            setPending((prev) =>
              prev.map((p) =>
                p.local_id === local_id
                  ? { ...p, status: "extracting", storage_path: path }
                  : p,
              ),
            );

            let text = await extractText(file, kind);
            if (text.length > MAX_EXTRACTED_TEXT_PER_FILE) {
              text = text.slice(0, MAX_EXTRACTED_TEXT_PER_FILE);
            }

            setPending((prev) =>
              prev.map((p) =>
                p.local_id === local_id
                  ? { ...p, status: "ready", extracted_text: text }
                  : p,
              ),
            );
          } catch (e) {
            const msg = (e as Error)?.message ?? "Upload failed.";
            setPending((prev) =>
              prev.map((p) =>
                p.local_id === local_id ? { ...p, status: "failed", error: msg } : p,
              ),
            );
          }
        }),
      );
    },
    [articleId, userId],
  );

  const removeAttachment = useCallback((local_id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.local_id === local_id);
      if (target?.storage_path) {
        void supabase.storage.from(BUCKET).remove([target.storage_path]);
      }
      return prev.filter((p) => p.local_id !== local_id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setPending((prev) => {
      const paths = prev
        .filter((p) => p.storage_path)
        .map((p) => p.storage_path!) as string[];
      if (paths.length > 0) {
        void supabase.storage.from(BUCKET).remove(paths);
      }
      return [];
    });
  }, []);

  const readyAttachments = pending.filter((p) => p.status === "ready");
  const hasInFlightWork = pending.some(
    (p) => p.status === "uploading" || p.status === "extracting",
  );

  return {
    pending,
    addFiles,
    removeAttachment,
    clearAll,
    readyAttachments,
    hasInFlightWork,
  };
}
