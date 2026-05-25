/**
 * Shared types + helpers for resolving newsletterRelatedArticles config to
 * actual article cards. Consumed by:
 *   - editor NodeView live preview
 *   - reader-path NodeView at render time
 *   - manual-mode picker dialog (uses list_admin_newsletter_articles)
 */
import { supabase } from "@/integrations/supabase/client";
import type { RelatedArticlesMode } from "@/components/newsletter/tiptap/types";

export interface RelatedArticleCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_asset_id: string | null;
  read_time_minutes: number | null;
  category_display_name: string | null;
}

export interface AdminRelatedArticleRow {
  id: string;
  title: string | null;
  slug: string | null;
  status: string;
  gate: string;
  excerpt: string | null;
  cover_asset_id: string | null;
  category_id: string | null;
  category_display_name: string | null;
  updated_at: string;
}

interface AdminListResponse {
  items: AdminRelatedArticleRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ResolveRelatedParams {
  mode: RelatedArticlesMode;
  sourceArticleId: string;
  maxCount: number;
  tagMatchMode: "any" | "all" | null;
  manualArticleIds: string[] | null;
}

/**
 * Resolve a RelatedArticles config to article cards via the appropriate
 * anon-callable RPC. Returns [] if the config can't resolve (e.g. manual
 * mode with no ids selected yet).
 */
export async function resolveRelatedArticles(
  params: ResolveRelatedParams,
): Promise<RelatedArticleCard[]> {
  const { mode, sourceArticleId, maxCount, tagMatchMode, manualArticleIds } =
    params;

  if (mode === "by_tags") {
    const { data, error } = await supabase.rpc(
      "get_related_articles_by_tags",
      {
        p_source_article_id: sourceArticleId,
        p_max_count: maxCount,
        p_tag_match_mode: tagMatchMode ?? "any",
      },
    );
    if (error) throw error;
    return ((data as unknown as { items?: RelatedArticleCard[] })?.items ?? []);
  }

  if (mode === "by_category") {
    const { data, error } = await supabase.rpc(
      "get_related_articles_by_category",
      {
        p_source_article_id: sourceArticleId,
        p_max_count: maxCount,
      },
    );
    if (error) throw error;
    return ((data as unknown as { items?: RelatedArticleCard[] })?.items ?? []);
  }

  // manual
  const ids = (manualArticleIds ?? []).filter((x) => x && x.length > 0);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc("get_related_articles_by_ids", {
    p_article_ids: ids,
    p_max_count: maxCount,
  });
  if (error) throw error;
  return ((data as unknown as { items?: RelatedArticleCard[] })?.items ?? []);
}

/**
 * Search the admin article list (returns drafts + gated + everything).
 * Used by the manual-mode picker dialog and selected-list metadata
 * resolution. The current article being edited can be excluded via the
 * `excludeId` arg.
 */
export async function searchAdminArticlesForPicker(opts: {
  search?: string;
  statusFilter?: string | null;
  limit?: number;
  offset?: number;
  excludeId?: string | null;
}): Promise<AdminListResponse> {
  const { data, error } = await supabase.rpc(
    "list_admin_newsletter_articles",
    {
      p_search: opts.search?.trim() ? opts.search.trim() : undefined,
      p_status_filter:
        opts.statusFilter && opts.statusFilter !== "all"
          ? opts.statusFilter
          : undefined,
      p_limit: opts.limit ?? 25,
      p_offset: opts.offset ?? 0,
    },
  );
  if (error) throw error;
  const raw = (data ?? {}) as Record<string, unknown>;
  let items =
    (raw.items as unknown as AdminRelatedArticleRow[] | undefined) ?? [];
  if (opts.excludeId) {
    items = items.filter((it) => it.id !== opts.excludeId);
  }
  return {
    items,
    total: (raw.total as number) ?? items.length,
    limit: (raw.limit as number) ?? items.length,
    offset: (raw.offset as number) ?? 0,
  };
}
