/**
 * User-scoped asset uploader (currently used for avatars only).
 *
 * Fork of uploadNewsletterAsset.ts: routes through request-asset-upload v6
 * with user_id parent + ref_field="avatar". The SQL RPC's user-mode
 * Ladder 6 writes users.avatar_asset_id directly, so no separate
 * set_user_avatar call is needed in the upload path.
 */
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type UserAssetKind = "image";

const ALLOWED_MIME: Record<UserAssetKind, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ],
};

const MAX_BYTES: Record<UserAssetKind, number> = {
  image: 5 * 1024 * 1024, // 5MB — bucket policy ceiling for avatars
};

const HUMAN_MAX: Record<UserAssetKind, string> = {
  image: "5MB",
};

export interface UserUploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export interface UserAssetUploadOptions {
  kind: UserAssetKind;
  file: File;
  userId: string;
  refField: "avatar";
  onProgress?: (p: UserUploadProgress) => void;
}

export async function uploadUserAsset({
  kind,
  file,
  userId,
  refField,
  onProgress,
}: UserAssetUploadOptions): Promise<{ asset_id: string }> {
  if (file.size > MAX_BYTES[kind]) {
    throw new Error(
      `Image too large (${Math.round(file.size / 1024)} KB). Max ${HUMAN_MAX[kind]}.`,
    );
  }
  if (!ALLOWED_MIME[kind].includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "(unknown)"}`);
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
      reason: `User ${kind} upload for ${refField} on user ${userId}`,
      user_id: userId,
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
    body: {
      asset_id,
      reason: `Finalize user ${kind} upload for ${refField} on user ${userId}`,
    },
  });
  if (finResp.error || finResp.data?.success === false) {
    throw new Error(
      finResp.error?.message ?? `Finalize failed: ${finResp.data?.error ?? "unknown"}`,
    );
  }

  return { asset_id };
}
