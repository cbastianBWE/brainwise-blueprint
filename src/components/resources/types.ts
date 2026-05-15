export type ResourceContentType =
  | "article"
  | "guide"
  | "video"
  | "worksheet"
  | "template";

export type ResourceUrlKind = "external_link" | "inline_html";

export interface Resource {
  resource_id: string;
  title: string;
  summary: string | null;
  url_or_content: string | null;
  url_kind: ResourceUrlKind | null;
  content_type: ResourceContentType;
  thumbnail_asset_id: string | null;
  content_asset_id: string | null;
  published_at: string;
  is_accessible: boolean;
}

export interface ResourceTab {
  tab_id: string;
  slug: string;
  name: string;
  display_order: number;
  is_coach_only: boolean;
  is_learning_tree: boolean;
  resources: Resource[] | null;
}

export interface GetUserResourcesResult {
  user_id: string;
  viewer_role: string;
  generated_at: string;
  tabs: ResourceTab[];
}

export type UpgradeEntityType =
  | ResourceContentType
  | "cert_path"
  | "curriculum"
  | "module";
