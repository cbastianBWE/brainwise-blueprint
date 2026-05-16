import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, FileText, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { mapRpcCascade, type CascadeResult } from "@/hooks/useCompletionReporter";

interface Props {
  contentItem: any;
  completion: any;
  viewerRole: "self" | "mentor" | "super_admin";
  onCascade?: (c: CascadeResult | null) => void;
}

function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "";
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function normalizeExtList(exts: string[] | null | undefined): string[] {
  if (!exts || exts.length === 0) return [];
  return exts.map((e) => e.replace(/^\./, "").toLowerCase());
}

async function parseInvokeError(err: any): Promise<{ code?: string; message: string; extra?: any }> {
  // FunctionsHttpError exposes context.response
  try {
    const resp = err?.context?.response;
    if (resp && typeof resp.json === "function") {
      const body = await resp.json();
      return { code: body?.error, message: body?.message ?? body?.error ?? "Upload failed", extra: body };
    }
  } catch {
    // ignore
  }
  return { message: err?.message ?? "Upload failed" };
}

async function uploadFile(file: File, contentItemId: string) {
  const reqRes = await supabase.functions.invoke("content-item-file-upload", {
    body: {
      action: "request",
      content_item_id: contentItemId,
      size_bytes: file.size,
      original_filename: file.name,
    },
  });
  if (reqRes.error) throw reqRes.error;
  if (reqRes.data?.error) {
    const e: any = new Error(reqRes.data.error);
    e.code = reqRes.data.error;
    e.extra = reqRes.data;
    throw e;
  }
  const { bucket, storage_path, upload_token } = reqRes.data;
  const up = await supabase.storage.from(bucket).uploadToSignedUrl(storage_path, upload_token, file);
  if (up.error) throw up.error;
  const fin = await supabase.functions.invoke("content-item-file-upload", {
    body: {
      action: "finalize",
      content_item_id: contentItemId,
      storage_path,
      original_filename: file.name,
      size_bytes: file.size,
    },
  });
  if (fin.error) throw fin.error;
  if (fin.data?.error) {
    const e: any = new Error(fin.data.error);
    e.code = fin.data.error;
    throw e;
  }
  return fin.data;
}

export default function FileUploadViewer({ contentItem, completion, viewerRole, onCascade }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const isReview = viewerRole !== "self";
  const allowed = normalizeExtList(contentItem.file_upload_allowed_extensions);
  const maxBytes: number | null = contentItem.file_upload_max_bytes ?? null;
  const isSubmitted = !!completion?.file_upload_url || !!completion?.file_upload_filename;

  const downloadQuery = useQuery({
    queryKey: ["file-upload-read", completion?.id, contentItem.id],
    enabled: isSubmitted,
    queryFn: async () => {
      const res = await supabase.functions.invoke("content-item-file-upload", {
        body: { action: "read", content_item_id: contentItem.id },
      });
      if (res.error) throw res.error;
      return res.data as { signed_url: string; filename: string };
    },
    staleTime: 60_000,
  });

  const handleError = async (err: any) => {
    const code = err?.code;
    let parsed = code ? { code, message: err.message, extra: err.extra } : await parseInvokeError(err);
    const allowedStr = (parsed.extra?.allowed ?? allowed).map((e: string) => e.toUpperCase()).join(", ");
    let msg = parsed.message;
    if (parsed.code === "file_exceeds_item_limit") {
      const limit = parsed.extra?.max_bytes ?? maxBytes;
      msg = `File exceeds the ${formatBytes(limit)} limit for this item.`;
    } else if (parsed.code === "extension_not_allowed") {
      msg = `That file type isn't accepted. Allowed: ${allowedStr || "see requirements"}.`;
    } else if (parsed.code === "file_too_large") {
      msg = "File exceeds the 500 MB ceiling.";
    }
    toast({ title: "Upload failed", description: msg, variant: "destructive" });
  };

  const onPick = () => inputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Client-side pre-validation
    if (allowed.length > 0) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowed.includes(ext)) {
        toast({
          title: "File type not accepted",
          description: `Allowed: ${allowed.map((x) => x.toUpperCase()).join(", ")}.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (maxBytes && file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `File exceeds the ${formatBytes(maxBytes)} limit for this item.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const finData = await uploadFile(file, contentItem.id);
      toast({ title: "File submitted", description: file.name });
      await queryClient.invalidateQueries({ queryKey: ["content-item-viewer", contentItem.id] });
      const cascade = mapRpcCascade((finData as any)?.cascade);
      onCascade?.(cascade);
    } catch (err) {
      await handleError(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{contentItem.title}</CardTitle>
        </CardHeader>
        {contentItem.description && (
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{contentItem.description}</p>
          </CardContent>
        )}
      </Card>

      <div className="text-sm text-muted-foreground space-y-1">
        <div>
          {allowed.length > 0
            ? `Accepted: ${allowed.map((x) => x.toUpperCase()).join(", ")}`
            : "Any file type"}
        </div>
        {maxBytes && <div>Max {formatBytes(maxBytes)}</div>}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={allowed.length > 0 ? allowed.map((x) => `.${x}`).join(",") : undefined}
        onChange={onFileChosen}
      />

      {isSubmitted ? (
        <div className="rounded-lg border border-[var(--bw-forest)]/30 bg-[var(--bw-forest)]/5 p-4">
          <div className="flex items-start gap-3">
            <CircleCheck className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--bw-forest)" }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">File submitted</div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{completion?.file_upload_filename ?? "Uploaded file"}</span>
                {completion?.file_upload_size_bytes != null && (
                  <span className="shrink-0">· {formatBytes(completion.file_upload_size_bytes)}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {downloadQuery.isLoading ? (
                  <span className="inline-flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Preparing download…
                  </span>
                ) : downloadQuery.data?.signed_url ? (
                  <a
                    href={downloadQuery.data.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-medium underline"
                    style={{ color: "var(--bw-forest)" }}
                  >
                    Download
                  </a>
                ) : downloadQuery.isError ? (
                  <button
                    onClick={() => downloadQuery.refetch()}
                    className="text-sm underline text-muted-foreground"
                  >
                    Retry download
                  </button>
                ) : null}
                {!isReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPick}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…
                      </>
                    ) : (
                      "Replace file"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isReview ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground text-center">
          No file submitted yet.
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Choose a file to upload for this item.
          </p>
          <Button
            onClick={onPick}
            disabled={uploading}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" /> Choose file
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
