/**
 * Shared upload helper used by newsletter NodeViews and the toolbar for image
 * and audio assets.
 *
 * Wraps the request-asset-upload → tus → finalize-asset-upload flow for the
 * newsletter-article-images bucket (which per H2-MIG-8 also accepts audio
 * MIMEs and 100MB ceiling). Returns the new asset_id on success.
 */
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type AssetKind = "image" | "audio";

const ALLOWED_MIME: Record<AssetKind, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
  ],
};

const MAX_BYTES: Record<AssetKind, number> = {
  image: 20 * 1024 * 1024, // 20MB
  audio: 100 * 1024 * 1024, // 100MB
};

const DEFAULT_REF_FIELD: Record<AssetKind, string> = {
  image: "inline_image",
  audio: "inline_audio",
};

const HUMAN_MAX: Record<AssetKind, string> = {
  image: "20MB",
  audio: "100MB",
};

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export interface NewsletterAssetUploadOptions {
  kind: AssetKind;
  file: File;
  articleId: string;
  refField?: string;
  onProgress?: (p: UploadProgress) => void;
}

export async function uploadNewsletterAsset({
  kind,
  file,
  articleId,
  refField,
  onProgress,
}: NewsletterAssetUploadOptions): Promise<{ asset_id: string }> {
  const effectiveRefField = refField ?? DEFAULT_REF_FIELD[kind];
  const kindLabel = kind === "audio" ? "Audio" : "Image";

  if (file.size > MAX_BYTES[kind]) {
    throw new Error(
      `${kindLabel} file too large (${Math.round(file.size / 1024)} KB). Max ${HUMAN_MAX[kind]}.`,
    );
  }
  if (!ALLOWED_MIME[kind].includes(file.type)) {
    throw new Error(`Unsupported ${kind} type: ${file.type || "(unknown)"}`);
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !session?.access_token) {
    throw new Error("Not authenticated.");
  }
  const accessToken = session.access_token;

  const reqResp = await supabase.functions.invoke("request-asset-upload", {
    body: {
      asset_kind: kind,
      size_bytes: file.size,
      mime_type: file.type,
      original_filename: file.name,
      reason: `Newsletter ${kind} upload for ${effectiveRefField} on article ${articleId}`,
      newsletter_article_id: articleId,
      ref_field: effectiveRefField,
    },
  });
  if (reqResp.error || !reqResp.data?.signed_upload_url) {
    throw new Error(reqResp.error?.message ?? "Failed to request upload URL.");
  }
  const { asset_id, upload_token, bucket, path } = reqResp.data as {
    asset_id: string;
    upload_token: string;
    bucket: string;
    path: string;
    signed_upload_url: string;
  };
  if (!upload_token || !bucket || !path) {
    throw new Error("Upload protocol error: missing token/bucket/path.");
  }

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err),
      onProgress: (loaded, total) => {
        if (onProgress) {
          onProgress({ loaded, total, pct: total ? (loaded / total) * 100 : 0 });
        }
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  const finResp = await supabase.functions.invoke("finalize-asset-upload", {
    body: {
      asset_id,
      reason: `Finalize newsletter ${kind} upload for article ${articleId}`,
    },
  });
  if (finResp.error || finResp.data?.success === false) {
    throw new Error(
      finResp.error?.message ?? `Finalize failed: ${finResp.data?.error ?? "unknown"}`,
    );
  }

  return { asset_id };
}
