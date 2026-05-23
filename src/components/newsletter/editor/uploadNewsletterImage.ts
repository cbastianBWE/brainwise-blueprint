/**
 * Shared upload helper used by image NodeViews and the toolbar image button.
 *
 * Wraps the request-asset-upload → tus → finalize-asset-upload flow for the
 * newsletter-article-images bucket. Returns the new asset_id on success.
 */
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
];
const MAX_BYTES = 20 * 1024 * 1024;

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export interface NewsletterImageUploadOptions {
  file: File;
  articleId: string;
  refField?: string;
  onProgress?: (p: UploadProgress) => void;
}

export async function uploadNewsletterImage({
  file,
  articleId,
  refField = "inline_image",
  onProgress,
}: NewsletterImageUploadOptions): Promise<{ asset_id: string }> {
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (${Math.round(file.size / 1024)} KB). Max 20 MB.`);
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Unsupported type: ${file.type || "(unknown)"}`);
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
      asset_kind: "image",
      size_bytes: file.size,
      mime_type: file.type,
      original_filename: file.name,
      reason: `Newsletter image upload for ${refField} on article ${articleId}`,
      newsletter_article_id: articleId,
      ref_field: refField,
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
    body: { asset_id, reason: `Finalize newsletter image upload for article ${articleId}` },
  });
  if (finResp.error || finResp.data?.success === false) {
    throw new Error(
      finResp.error?.message ?? `Finalize failed: ${finResp.data?.error ?? "unknown"}`,
    );
  }

  return { asset_id };
}
