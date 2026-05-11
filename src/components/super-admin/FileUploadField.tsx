import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  FileSpreadsheet,
  Presentation,
  RotateCw,
  X,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type AssetKind = "image" | "video" | "audio" | "document";

interface FileUploadFieldProps {
  assetKind: AssetKind;
  contentItemId?: string | null;
  lessonBlockId?: string | null;
  isLibraryAsset?: boolean;
  refField?: string | null;
  libraryName?: string | null;
  libraryTags?: string[] | null;
  value: string | null;
  onChange: (newAssetId: string | null) => void;
  reasonOverride?: string;
  disabled?: boolean;
}

const ASSET_KIND_CONFIG = {
  image: {
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"],
    extensions: ".jpg,.jpeg,.png,.webp,.gif,.svg,.avif",
    label: "image",
    hintLine: "JPG, PNG, WebP, GIF, SVG, AVIF up to 20 MB",
  },
  video: {
    maxBytes: 5 * 1024 * 1024 * 1024,
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: ".mp4,.webm,.mov",
    label: "video",
    hintLine: "MP4, WebM, MOV up to 5 GB",
  },
  audio: {
    maxBytes: 100 * 1024 * 1024,
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4"],
    extensions: ".mp3,.wav,.webm,.ogg,.m4a",
    label: "audio",
    hintLine: "MP3, WAV, WebM, OGG, M4A up to 100 MB",
  },
  document: {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: ".pdf,.docx,.xlsx,.pptx",
    label: "document",
    hintLine: "PDF, DOCX, XLSX, PPTX up to 50 MB",
  },
} as const;

function assetKindIcon(kind: AssetKind) {
  switch (kind) {
    case "image": return ImageIcon;
    case "video": return Video;
    case "audio": return Music;
    case "document": return FileText;
  }
}

function documentExtIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx") return FileSpreadsheet;
  if (ext === "pptx") return Presentation;
  return FileText;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

type UploadState =
  | { kind: "empty" }
  | { kind: "uploading"; filename: string; progress: number }
  | { kind: "uploaded"; assetId: string }
  | { kind: "error"; message: string };

function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
  xhrRef: React.MutableRefObject<XMLHttpRequest | null>
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(file);
  });
}

export function FileUploadField({
  assetKind,
  contentItemId,
  lessonBlockId,
  isLibraryAsset,
  refField,
  libraryName,
  libraryTags,
  value,
  onChange,
  reasonOverride,
  disabled,
}: FileUploadFieldProps) {
  const config = ASSET_KIND_CONFIG[assetKind];
  const Icon = assetKindIcon(assetKind);
  const [state, setState] = useState<UploadState>(value ? { kind: "uploaded", assetId: value } : { kind: "empty" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Sync external value changes
  useEffect(() => {
    if (value && state.kind !== "uploading") {
      setState({ kind: "uploaded", assetId: value });
    } else if (!value && state.kind === "uploaded") {
      setState({ kind: "empty" });
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const { data: asset } = useQuery({
    queryKey: ["content_asset", value],
    enabled: !!value,
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from("content_assets")
        .select(`
          id, asset_kind, status, is_library_asset, library_name,
          current_version:content_asset_versions!current_version_id(
            id, bucket, path, mime_type, size_bytes, original_filename
          )
        `)
        .eq("id", value)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch signed URL for image preview
  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      if (!asset?.current_version || assetKind !== "image") return;
      const { data, error } = await supabase.storage
        .from(asset.current_version.bucket)
        .createSignedUrl(asset.current_version.path, 600);
      if (!cancelled && !error && data) setPreviewUrl(data.signedUrl);
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, [asset, assetKind]);

  const startUpload = useCallback(async (file: File) => {
    // Pre-validate
    if (file.size > config.maxBytes) {
      setState({ kind: "error", message: `File too large: ${formatBytes(file.size)} exceeds ${formatBytes(config.maxBytes)} ceiling for ${assetKind}.` });
      return;
    }
    if (!(config.mimeTypes as readonly string[]).includes(file.type)) {
      setState({ kind: "error", message: `File type not allowed: ${file.type || "(unknown)"}. Allowed for ${assetKind}: ${config.extensions}` });
      return;
    }

    setState({ kind: "uploading", filename: file.name, progress: 0 });

    const defaultReason = isLibraryAsset
      ? `Library asset upload: ${libraryName ?? "(unnamed)"}`
      : contentItemId
        ? `Asset upload for ${refField ?? "field"} on content_item ${contentItemId}`
        : `Asset upload for ${refField ?? "field"} on lesson_block ${lessonBlockId}`;
    const reason = (reasonOverride && reasonOverride.length >= 10) ? reasonOverride : defaultReason;

    const reqResp = await supabase.functions.invoke("request-asset-upload", {
      body: {
        asset_kind: assetKind,
        size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        reason,
        content_item_id: contentItemId ?? null,
        lesson_block_id: lessonBlockId ?? null,
        ref_field: refField ?? null,
        is_library_asset: isLibraryAsset ?? false,
        library_name: libraryName ?? null,
        library_tags: libraryTags ?? null,
      },
    });
    if (reqResp.error || !reqResp.data?.signed_upload_url) {
      setState({ kind: "error", message: reqResp.error?.message ?? "Failed to request upload URL." });
      return;
    }
    const { asset_id, signed_upload_url } = reqResp.data;

    try {
      const uploadResp = await uploadWithProgress(
        signed_upload_url,
        file,
        (pct) => setState((s) => (s.kind === "uploading" ? { ...s, progress: pct } : s)),
        xhrRef
      );
      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        setState({ kind: "error", message: `Upload failed: ${uploadResp.status} ${errText.slice(0, 200)}` });
        return;
      }
    } catch (err: any) {
      if (err?.message === "Upload aborted") {
        setState({ kind: "empty" });
      } else {
        setState({ kind: "error", message: err?.message ?? "Upload failed." });
      }
      return;
    } finally {
      xhrRef.current = null;
    }

    const finResp = await supabase.functions.invoke("finalize-asset-upload", {
      body: { asset_id, reason: `Finalize: ${reason}` },
    });
    if (finResp.error) {
      setState({ kind: "error", message: finResp.error.message ?? "Finalize failed." });
      return;
    }
    if (finResp.data?.success === false) {
      setState({ kind: "error", message: `Upload didn't complete: ${finResp.data.error ?? "unknown"}` });
      return;
    }

    setState({ kind: "uploaded", assetId: asset_id });
    onChange(asset_id);
  }, [assetKind, config, contentItemId, lessonBlockId, refField, isLibraryAsset, libraryName, libraryTags, reasonOverride, onChange]);

  const handleReplaceUpload = useCallback(async (file: File) => {
    const oldId = value;
    if (!oldId) return;
    // Pre-validate
    if (file.size > config.maxBytes) {
      setState({ kind: "error", message: `File too large: ${formatBytes(file.size)} exceeds ${formatBytes(config.maxBytes)} ceiling for ${assetKind}.` });
      return;
    }
    if (!(config.mimeTypes as readonly string[]).includes(file.type)) {
      setState({ kind: "error", message: `File type not allowed: ${file.type || "(unknown)"}. Allowed for ${assetKind}: ${config.extensions}` });
      return;
    }

    setState({ kind: "uploading", filename: file.name, progress: 0 });

    const defaultReason = isLibraryAsset
      ? `Library asset upload: ${libraryName ?? "(unnamed)"}`
      : contentItemId
        ? `Asset upload for ${refField ?? "field"} on content_item ${contentItemId}`
        : `Asset upload for ${refField ?? "field"} on lesson_block ${lessonBlockId}`;
    const reason = (reasonOverride && reasonOverride.length >= 10) ? reasonOverride : defaultReason;

    const reqResp = await supabase.functions.invoke("request-asset-upload", {
      body: {
        asset_kind: assetKind,
        size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        reason,
        content_item_id: contentItemId ?? null,
        lesson_block_id: lessonBlockId ?? null,
        ref_field: refField ?? null,
        is_library_asset: isLibraryAsset ?? false,
        library_name: libraryName ?? null,
        library_tags: libraryTags ?? null,
      },
    });
    if (reqResp.error || !reqResp.data?.signed_upload_url) {
      setState({ kind: "error", message: reqResp.error?.message ?? "Failed to request upload URL." });
      return;
    }
    const { asset_id: newAssetId, signed_upload_url } = reqResp.data;

    try {
      const uploadResp = await uploadWithProgress(
        signed_upload_url,
        file,
        (pct) => setState((s) => (s.kind === "uploading" ? { ...s, progress: pct } : s)),
        xhrRef
      );
      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        setState({ kind: "error", message: `Upload failed: ${uploadResp.status} ${errText.slice(0, 200)}` });
        return;
      }
    } catch (err: any) {
      if (err?.message === "Upload aborted") {
        setState({ kind: "uploaded", assetId: oldId });
      } else {
        setState({ kind: "error", message: err?.message ?? "Upload failed." });
      }
      return;
    } finally {
      xhrRef.current = null;
    }

    const finResp = await supabase.functions.invoke("finalize-asset-upload", {
      body: { asset_id: newAssetId, reason: `Finalize: ${reason}` },
    });
    if (finResp.error || finResp.data?.success === false) {
      setState({ kind: "error", message: finResp.error?.message ?? `Upload didn't complete: ${finResp.data?.error ?? "unknown"}` });
      return;
    }

    const { error: replaceErr } = await supabase.rpc("replace_asset", {
      p_old_asset_id: oldId,
      p_new_asset_id: newAssetId,
      p_reason: "Author replaced asset via FileUploadField",
    });
    if (replaceErr) {
      setState({ kind: "error", message: `Replace failed: ${replaceErr.message}` });
      return;
    }

    setState({ kind: "uploaded", assetId: newAssetId });
    onChange(newAssetId);
  }, [value, assetKind, config, contentItemId, lessonBlockId, refField, isLibraryAsset, libraryName, libraryTags, reasonOverride, onChange]);

  const handleFileSelected = (file: File | null | undefined) => {
    if (!file) return;
    startUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || state.kind === "uploading") return;
    const file = e.dataTransfer.files?.[0];
    handleFileSelected(file);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setState({ kind: "empty" });
  };

  // ===== Render =====
  if (state.kind === "uploading") {
    return (
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#006D77]" />
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium">{state.filename}</div>
            <div className="text-xs text-muted-foreground">{state.progress}%</div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={cancelUpload} aria-label="Cancel upload">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={state.progress} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-md border border-destructive bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-destructive">{state.message}</div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="destructive" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            <RotateCw className="h-4 w-4" /> Retry
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setState(value ? { kind: "uploaded", assetId: value } : { kind: "empty" })}>
            Cancel
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={config.extensions}
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
      </div>
    );
  }

  if (state.kind === "uploaded" && value) {
    const ver = asset?.current_version;
    const filename = ver?.original_filename ?? "(loading…)";
    const sizeStr = ver?.size_bytes ? formatBytes(ver.size_bytes) : "";
    const ext = filename.split(".").pop()?.toUpperCase() ?? "";

    let preview;
    if (assetKind === "image") {
      preview = (
        <div className="aspect-video rounded-md overflow-hidden bg-muted">
          {previewUrl ? (
            <img src={previewUrl} alt={filename} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      );
    } else if (assetKind === "video") {
      preview = (
        <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
          <Video className="h-12 w-12 text-muted-foreground" />
        </div>
      );
    } else if (assetKind === "audio") {
      preview = (
        <div className="rounded-md bg-[#F9F7F1] p-6 flex items-center justify-center">
          <Music className="h-12 w-12 text-[#006D77]" />
        </div>
      );
    } else {
      const DocIcon = documentExtIcon(filename);
      preview = (
        <div className="rounded-md bg-[#F9F7F1] p-6 flex items-center justify-center">
          <DocIcon className="h-12 w-12 text-[#006D77]" />
        </div>
      );
    }

    return (
      <div className="rounded-md border p-3 space-y-3">
        {preview}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{filename}</span>
              {assetKind === "document" && ext && (
                <span className="text-xs font-mono bg-muted rounded-full px-2 py-0.5">{ext}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{sizeStr} · {assetKind}</div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setReplaceOpen(true)} disabled={disabled}>
            <RotateCw className="h-4 w-4" /> Replace
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => setRemoveOpen(true)} disabled={disabled} aria-label="Remove">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <input
          ref={replaceInputRef}
          type="file"
          accept={config.extensions}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReplaceUpload(f);
            e.target.value = "";
          }}
        />

        <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace this asset?</AlertDialogTitle>
              <AlertDialogDescription>
                The current file will be archived. Existing references to it will be re-pointed to the new file once it uploads.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setReplaceOpen(false); replaceInputRef.current?.click(); }}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this asset?</AlertDialogTitle>
              <AlertDialogDescription>
                This will unlink the asset from this field. If no other places reference it, the asset will be auto-archived (recoverable for 22 days).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setRemoveOpen(false); setState({ kind: "empty" }); setPreviewUrl(null); onChange(null); }}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Empty state
  return (
    <div
      className={cn(
        "rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
        isDragOver ? "border-[#006D77] bg-[#006D77]/5" : "border-muted-foreground/25 hover:border-[#006D77]/50",
        disabled && "opacity-50 pointer-events-none"
      )}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <Icon className="h-8 w-8 mx-auto text-muted-foreground" style={{ opacity: 0.6 }} />
      <p className="mt-3 text-sm font-medium">Drop a file here, or click to browse</p>
      <p className="mt-1 text-xs text-muted-foreground">{config.hintLine}</p>
      <input
        ref={fileInputRef}
        type="file"
        accept={config.extensions}
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
    </div>
  );
}

export default FileUploadField;
