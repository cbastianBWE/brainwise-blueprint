import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";

export type VersionType =
  | "draft"
  | "named_revision"
  | "scheduled"
  | "published"
  | "restored_from";

export interface VersionListItem {
  version_id: string;
  version_number: number;
  version_type: VersionType;
  version_name: string | null;
  title_snapshot: string | null;
  body_preview: string | null;
  created_at: string;
  created_by_user_id: string | null;
  created_by_display_name: string | null;
  restored_from_version_id: string | null;
}

export interface VersionListResponse {
  items: VersionListItem[];
  total: number;
  capped: boolean;
}

export interface VersionMetadataSnapshot {
  gate?: string;
  allowed_plan_tiers?: string[];
  authors?: string[];
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  cover_asset_id?: string | null;
  og_image_asset_id?: string | null;
  source_type?: string;
  word_count?: number;
  read_time_minutes?: number;
}

export interface VersionFull {
  version_id: string;
  article_id: string;
  version_number: number;
  version_type: VersionType;
  version_name: string | null;
  body_tiptap: NewsletterTipTapDoc;
  title_snapshot: string | null;
  excerpt_snapshot: string | null;
  metadata_snapshot: VersionMetadataSnapshot | null;
  created_at: string;
  created_by_user_id: string | null;
  created_by_display_name: string | null;
  restored_from_version_id: string | null;
}

export interface CurrentDraft {
  body_tiptap: NewsletterTipTapDoc;
  title: string;
  excerpt: string;
}
