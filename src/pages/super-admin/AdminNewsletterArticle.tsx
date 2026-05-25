import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  ExternalLink,
  ChevronDown,
  Pencil,
  AlertCircle,
  CalendarClock,
  History,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { NewsletterEditor, type NewsletterEditorHandle } from "@/components/newsletter/editor/NewsletterEditor";
import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";
import VersionHistorySheet from "@/components/newsletter/versions/VersionHistorySheet";
import ImportHtmlModal from "@/components/newsletter/editor/ImportHtmlModal";
import { NewsletterAiPane } from "@/components/super-admin/newsletter/ai-copilot/NewsletterAiPane";

type Status = "draft" | "scheduled" | "published" | "unpublished" | "archived";
type Gate = "public" | "subscribers" | "plan_tier";
type PlanTier = "starter" | "pro" | "enterprise";

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  body_tiptap: NewsletterTipTapDoc;
  gate: Gate;
  allowed_plan_tiers: PlanTier[];
  cover_asset_id: string | null;
  og_image_asset_id: string | null;
  author_user_ids: string[];
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  source_type: "html_import" | "native";
  category_id: string | null;
  tags: string[];
  eyebrow_text: string | null;
  is_issue_based: boolean;
  issue_label: string | null;
  masthead_publication: string | null;
  masthead_logo_glyph: string | null;
  default_layout_width: "standard" | "wide" | "narrow";
  theme_variant: "default" | "editorial" | "minimal" | "technical";
}

interface ArticleRecord extends Draft {
  id: string;
  status: Status;
  publish_at: string | null;
}

const STATUS_BADGE: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-teal-50 text-teal-800 border-teal-200",
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  unpublished: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-slate-200 text-slate-600 border-slate-300",
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const EMPTY_DOC: NewsletterTipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const PLAN_TIERS: PlanTier[] = ["starter", "pro", "enterprise"];

export default function AdminNewsletterArticle() {
  const { articleId: routeId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isCreate = routeId === "new";
  const articleId = isCreate ? null : routeId ?? null;

  // ----- Load existing article -----
  const { data: existing, isLoading: loadingArticle } = useQuery({
    queryKey: ["newsletter-article", articleId],
    enabled: !!articleId,
    queryFn: async (): Promise<ArticleRecord | null> => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from("newsletter_articles")
        .select("id, title, slug, excerpt, body_tiptap, gate, allowed_plan_tiers, cover_asset_id, og_image_asset_id, seo_title, seo_description, canonical_url, source_type, status, scheduled_for, category_id, tags, eyebrow_text, is_issue_based, issue_label, masthead_publication, masthead_logo_glyph, default_layout_width, theme_variant")
        .eq("id", articleId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: authors } = await supabase
        .from("newsletter_article_authors")
        .select("author_user_id")
        .eq("article_id", articleId);
      return {
        id: data.id,
        title: data.title ?? "",
        slug: data.slug ?? "",
        excerpt: data.excerpt ?? "",
        body_tiptap: (data.body_tiptap as unknown as NewsletterTipTapDoc) ?? EMPTY_DOC,
        gate: (data.gate as Gate) ?? "public",
        allowed_plan_tiers: (data.allowed_plan_tiers as PlanTier[]) ?? [],
        cover_asset_id: data.cover_asset_id ?? null,
        og_image_asset_id: data.og_image_asset_id ?? null,
        author_user_ids: (authors ?? []).map((a) => a.author_user_id),
        seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "",
        canonical_url: data.canonical_url ?? "",
        source_type: (data.source_type as "html_import" | "native") ?? "native",
        status: (data.status as Status) ?? "draft",
        publish_at: data.scheduled_for ?? null,
        category_id: data.category_id ?? null,
        tags: (data.tags as string[]) ?? [],
        eyebrow_text: data.eyebrow_text ?? null,
        is_issue_based: data.is_issue_based ?? false,
        issue_label: data.issue_label ?? null,
        masthead_publication: data.masthead_publication ?? null,
        masthead_logo_glyph: data.masthead_logo_glyph ?? null,
        default_layout_width: (data.default_layout_width as "standard" | "wide" | "narrow") ?? "standard",
        theme_variant: (data.theme_variant as "default" | "editorial" | "minimal" | "technical") ?? "default",
      };
    },
  });

  const [draft, setDraft] = useState<Draft>({
    title: "",
    slug: "",
    excerpt: "",
    body_tiptap: EMPTY_DOC,
    gate: "public",
    allowed_plan_tiers: [],
    cover_asset_id: null,
    og_image_asset_id: null,
    author_user_ids: user?.id ? [user.id] : [],
    seo_title: "",
    seo_description: "",
    canonical_url: "",
    source_type: "native",
    category_id: null,
    tags: [],
    eyebrow_text: null,
    is_issue_based: false,
    issue_label: null,
    masthead_publication: null,
    masthead_logo_glyph: null,
    default_layout_width: "standard",
    theme_variant: "default",
  });
  const [status, setStatus] = useState<Status>("draft");
  const [publishAt, setPublishAt] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // hydrate from server load
  useEffect(() => {
    if (!existing || hydrated) return;
    setDraft({
      title: existing.title,
      slug: existing.slug,
      excerpt: existing.excerpt,
      body_tiptap: existing.body_tiptap,
      gate: existing.gate,
      allowed_plan_tiers: existing.allowed_plan_tiers,
      cover_asset_id: existing.cover_asset_id,
      og_image_asset_id: existing.og_image_asset_id,
      author_user_ids: existing.author_user_ids.length ? existing.author_user_ids : (user?.id ? [user.id] : []),
      seo_title: existing.seo_title,
      seo_description: existing.seo_description,
      canonical_url: existing.canonical_url,
      source_type: existing.source_type,
      category_id: existing.category_id,
      tags: existing.tags,
      eyebrow_text: existing.eyebrow_text,
      is_issue_based: existing.is_issue_based,
      issue_label: existing.issue_label,
      masthead_publication: existing.masthead_publication,
      masthead_logo_glyph: existing.masthead_logo_glyph,
      default_layout_width: existing.default_layout_width,
      theme_variant: existing.theme_variant,
    });
    setStatus(existing.status);
    setPublishAt(existing.publish_at);
    setSlugManuallyEdited(!!existing.slug);
    setHydrated(true);
  }, [existing, hydrated, user]);

  // Set Cole as default author on create once user loads
  useEffect(() => {
    if (isCreate && user?.id && draft.author_user_ids.length === 0) {
      setDraft((d) => ({ ...d, author_user_ids: [user.id] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isCreate]);

  // ----- Auto-save -----
  type SaveState = "idle" | "unsaved" | "saving" | "saved";
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const articleIdRef = useRef<string | null>(articleId);
  articleIdRef.current = articleId;
  const editorHandleRef = useRef<NewsletterEditorHandle | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savingPromiseRef = useRef<Promise<void> | null>(null);
  // suppress auto-save during initial hydration of existing article
  const dirtyRef = useRef(false);

  const flushSave = useCallback(async (reason = "Auto-save: editor pause") => {
    if (savingPromiseRef.current) {
      await savingPromiseRef.current;
    }
    const current = draftRef.current;
    // skip empty create
    const isEmpty = !current.title.trim() && !current.excerpt.trim()
      && JSON.stringify(current.body_tiptap) === JSON.stringify(EMPTY_DOC);
    if (!articleIdRef.current && isEmpty) {
      return;
    }
    setSaveState("saving");
    const wordCount = current.body_tiptap ? estimateWordCount(current.body_tiptap) : 0;
    const readTime = Math.max(1, Math.round(wordCount / 220));
    const promise = (async () => {
      const { data, error } = await supabase.rpc("upsert_article", {
        p_article_id: articleIdRef.current as unknown as string,
        p_slug: current.slug || slugify(current.title || "untitled-" + Date.now().toString(36)),
        p_title: current.title || "Untitled",
        p_excerpt: current.excerpt,
        p_body_tiptap: current.body_tiptap as unknown as never,
        p_gate: current.gate,
        p_allowed_plan_tiers: current.allowed_plan_tiers,
        p_cover_asset_id: current.cover_asset_id as unknown as string,
        p_og_image_asset_id: current.og_image_asset_id as unknown as string,
        p_seo_title: current.seo_title,
        p_seo_description: current.seo_description,
        p_canonical_url: current.canonical_url,
        p_source_type: current.source_type,
        p_author_user_ids: current.author_user_ids,
        p_word_count: wordCount,
        p_read_time_minutes: readTime,
        p_reason: reason.length >= 10 ? reason : "Auto-save: editor pause",
        // H3-NV — article-level fields wired end-to-end.
        p_default_layout_width: current.default_layout_width as unknown as string,
        p_eyebrow_text: (current.eyebrow_text as unknown as string) ?? (null as unknown as string),
        p_is_issue_based: current.is_issue_based as unknown as boolean,
        p_issue_label: (current.issue_label as unknown as string) ?? (null as unknown as string),
        p_masthead_logo_glyph: (current.masthead_logo_glyph as unknown as string) ?? (null as unknown as string),
        p_masthead_publication: (current.masthead_publication as unknown as string) ?? (null as unknown as string),
        p_tags: (current.tags as unknown as string[]) ?? (null as unknown as string[]),
        p_theme_variant: current.theme_variant as unknown as string,
        // P7b — category_id (H2-MIG-10a-1/2). Required by upsert_article v26.
        p_category_id: (current.category_id as unknown as string) ?? (null as unknown as string),
      });
      if (error) throw error;
      const resp = (data ?? {}) as { article_id?: string; is_create?: boolean };
      if (resp.article_id && !articleIdRef.current) {
        articleIdRef.current = resp.article_id;
        navigate(`/super-admin/newsletter/${resp.article_id}`, { replace: true });
        queryClient.invalidateQueries({ queryKey: ["newsletter-article", resp.article_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["newsletter-articles"] });
    })();
    savingPromiseRef.current = promise;
    try {
      await promise;
      setSaveState("saved");
      setLastSavedAt(new Date());
      dirtyRef.current = false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Auto-save failed: ${msg}`);
      setSaveState("unsaved");
    } finally {
      savingPromiseRef.current = null;
    }
  }, [navigate, queryClient]);

  // schedule debounced save on draft changes
  useEffect(() => {
    if (!hydrated && !isCreate) return; // wait for hydration on edit
    if (!dirtyRef.current) {
      // first render after hydration — mark clean
      dirtyRef.current = false;
      return;
    }
    setSaveState("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { flushSave(); }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const markDirty = () => { dirtyRef.current = true; };

  // visibilitychange / unmount flush
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden" && dirtyRef.current) flushSave(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (dirtyRef.current) flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Mutators -----
  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    markDirty();
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onTitleChange = (newTitle: string) => {
    markDirty();
    setDraft((d) => {
      const next = { ...d, title: newTitle };
      // auto-derive slug if not manually edited
      if (!slugManuallyEdited) {
        next.slug = slugify(newTitle);
      }
      return next;
    });
  };

  // ----- Authors picker data -----
  const { data: candidateAuthors } = useQuery({
    queryKey: ["newsletter-author-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("account_type", "brainwise_super_admin")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ----- Categories (P7b) -----
  const { data: categories } = useQuery({
    queryKey: ["newsletter-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_active_newsletter_categories");
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      return ((raw.items as Array<{ id: string; slug: string; display_name: string }>) ?? []);
    },
  });

  // ----- State transitions -----
  const [transitionDialog, setTransitionDialog] = useState<null | {
    kind: "publish" | "cancel_schedule" | "unpublish" | "archive";
    title: string;
    description: string;
  }>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [openingVersionHistory, setOpeningVersionHistory] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiImportHtml, setAiImportHtml] = useState<string | undefined>(undefined);
  const [aiPaneOpen, setAiPaneOpen] = useState(false);

  const handleOpenVersionHistory = async () => {
    if (!articleIdRef.current) return;
    setOpeningVersionHistory(true);
    try {
      if (dirtyRef.current || savingPromiseRef.current) {
        await flushSave("Auto-save: opening version history");
      }
    } finally {
      setOpeningVersionHistory(false);
      setVersionHistoryOpen(true);
    }
  };

  const refreshArticle = () => {
    if (articleIdRef.current) {
      queryClient.invalidateQueries({ queryKey: ["newsletter-article", articleIdRef.current] });
    }
    queryClient.invalidateQueries({ queryKey: ["newsletter-articles"] });
  };

  const runTransition = async () => {
    if (!transitionDialog || !articleIdRef.current) return;
    if (transitionReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters.");
      return;
    }
    setTransitioning(true);
    await flushSave("Pre-transition save: ensuring latest");
    const id = articleIdRef.current;
    const reason = transitionReason.trim();
    let error: { message: string } | null = null;
    if (transitionDialog.kind === "publish") {
      ({ error } = await supabase.rpc("publish_article", { p_article_id: id, p_reason: reason }));
    } else if (transitionDialog.kind === "cancel_schedule") {
      ({ error } = await supabase.rpc("cancel_scheduled_article", { p_article_id: id, p_reason: reason }));
    } else if (transitionDialog.kind === "unpublish") {
      ({ error } = await supabase.rpc("unpublish_article", { p_article_id: id, p_reason: reason }));
    } else if (transitionDialog.kind === "archive") {
      ({ error } = await supabase.rpc("archive_article", { p_article_id: id, p_reason: reason }));
    }
    setTransitioning(false);
    if (error) {
      toast.error(`Action failed: ${error.message}`);
      return;
    }
    toast.success("Status updated");
    setTransitionDialog(null);
    setTransitionReason("");
    setHydrated(false); // re-hydrate to pick up new status
    refreshArticle();
  };

  // ----- Loading state -----
  if (loadingArticle && !isCreate) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const canPublishGated = draft.excerpt.trim().length >= 20;
  const isGated = draft.gate !== "public";

  return (
    <TooltipProvider>
      <div className="-m-6 min-h-[calc(100vh-56px)] flex flex-col bg-slate-50">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/newsletter")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1 truncate text-sm text-slate-500">
            {draft.title || "Untitled article"}
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} savedAt={lastSavedAt} />
            <StatusPill
              status={status}
              onAction={(kind) => {
                if (kind === "publish") {
                  if (isGated && !canPublishGated) {
                    toast.error("Excerpt must be at least 20 characters to publish a gated article.");
                    return;
                  }
                  setTransitionDialog({
                    kind: "publish",
                    title: "Publish this article?",
                    description: `It will be visible at /newsletter/${draft.slug || "(set a slug first)"} immediately.`,
                  });
                } else if (kind === "schedule") {
                  setScheduleOpen(true);
                } else if (kind === "cancel_schedule") {
                  setTransitionDialog({
                    kind: "cancel_schedule",
                    title: "Cancel scheduled publish?",
                    description: "The article will return to draft status.",
                  });
                } else if (kind === "unpublish") {
                  setTransitionDialog({
                    kind: "unpublish",
                    title: "Unpublish this article?",
                    description: "Readers will see a 404. The article remains editable.",
                  });
                } else if (kind === "archive") {
                  setTransitionDialog({
                    kind: "archive",
                    title: "Archive this article?",
                    description: "This is permanent and the article will be removed from the public archive.",
                  });
                }
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCreate || !articleId || openingVersionHistory}
                    onClick={handleOpenVersionHistory}
                  >
                    {openingVersionHistory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <History className="h-4 w-4" />
                    )}{" "}
                    Version history
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isCreate ? "Save the draft first" : "View past versions and restore"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!draft.slug}
                  onClick={() => {
                    if (draft.slug) window.open(`/newsletter/${draft.slug}`, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4" /> Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {draft.slug ? "Opens public reader (G6)" : "Set a slug to preview"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant={aiPaneOpen ? "secondary" : "ghost"}
                    size="sm"
                    disabled={isCreate || !articleId}
                    onClick={() => setAiPaneOpen((v) => !v)}
                  >
                    <Sparkles className="h-4 w-4" /> AI co-pilot
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isCreate || !articleId
                  ? "Save the article first to enable the AI co-pilot."
                  : aiPaneOpen ? "Hide co-pilot" : "Open AI co-pilot"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-6">
          {/* Editor column */}
          <div className="space-y-6 min-w-0">
            {/* Cover image */}
            <section>
              <Label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Cover image</Label>
              {isCreate ? (
                <div className="min-h-[280px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white text-slate-400 text-sm">
                  Save the draft first to enable cover image upload.
                </div>
              ) : (
                <div className="min-h-[280px]">
                  <FileUploadField
                    assetKind="image"
                    newsletterArticleId={articleId}
                    refField="cover"
                    value={draft.cover_asset_id}
                    onChange={(id) => setField("cover_asset_id", id)}
                  />
                </div>
              )}
            </section>

            {/* Title + slug */}
            <section className="space-y-2">
              <input
                value={draft.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Untitled article"
                autoFocus={isCreate}
                className="w-full bg-transparent border-0 outline-none font-display text-4xl font-bold text-[var(--bw-navy)] placeholder:text-slate-300"
              />
              <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                <span>brainwiseenterprises.com/newsletter/</span>
                {editingSlug ? (
                  <Input
                    value={draft.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setField("slug", slugify(e.target.value));
                    }}
                    onBlur={() => setEditingSlug(false)}
                    autoFocus
                    className="h-7 w-[280px] text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingSlug(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 font-mono text-xs"
                  >
                    {draft.slug || "(no slug)"} <Pencil className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            </section>

            {/* Excerpt */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Excerpt</Label>
              <Textarea
                value={draft.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                placeholder="A short summary used in archive cards, social previews, and as the teaser for gated articles."
                rows={3}
                className="text-base italic"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  "text-slate-400",
                  isGated && !canPublishGated && "text-amber-600 flex items-center gap-1",
                )}>
                  {isGated && !canPublishGated && <AlertCircle className="h-3 w-3" />}
                  {isGated && !canPublishGated && "Min 20 chars to publish gated articles. "}
                  {draft.excerpt.length} characters
                </span>
              </div>
            </section>

            {/* Body editor */}
            <section>
              <Label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Body</Label>
              {isCreate ? (
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Type a title above — your draft will be saved automatically. The full editor will load once the draft exists.
                </div>
              ) : (
                <NewsletterEditor
                  ref={editorHandleRef}
                  articleId={articleId ?? ""}
                  initialContent={draft.body_tiptap}
                  onChange={(next) => setField("body_tiptap", next)}
                  onOpenImportHtml={articleId ? () => setImportOpen(true) : undefined}
                  tags={draft.tags}
                  categoryId={draft.category_id}
                />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Tabs defaultValue="settings">
              <TabsList className="w-full">
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Visibility</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <RadioGroup
                      value={draft.gate}
                      onValueChange={(v) => setField("gate", v as Gate)}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="public" id="gate-public" />
                        <Label htmlFor="gate-public" className="font-normal">Public</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="subscribers" id="gate-sub" />
                        <Label htmlFor="gate-sub" className="font-normal">Subscribers only</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="plan_tier" id="gate-tier" />
                        <Label htmlFor="gate-tier" className="font-normal">Plan tier</Label>
                      </div>
                    </RadioGroup>
                    {draft.gate === "plan_tier" && (
                      <div className="ml-6 space-y-2 border-l border-slate-200 pl-3">
                        {PLAN_TIERS.map((tier) => (
                          <div key={tier} className="flex items-center gap-2">
                            <Checkbox
                              id={`tier-${tier}`}
                              checked={draft.allowed_plan_tiers.includes(tier)}
                              onCheckedChange={(checked) => {
                                setField("allowed_plan_tiers",
                                  checked
                                    ? [...draft.allowed_plan_tiers, tier]
                                    : draft.allowed_plan_tiers.filter((t) => t !== tier)
                                );
                              }}
                            />
                            <Label htmlFor={`tier-${tier}`} className="font-normal capitalize">{tier}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Category & tags</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cat-select" className="text-xs">Category</Label>
                      <select
                        id="cat-select"
                        value={draft.category_id ?? ""}
                        onChange={(e) => setField("category_id", e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— None —</option>
                        {(categories ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.display_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tags-input" className="text-xs">Tags (comma-separated)</Label>
                      <Input
                        id="tags-input"
                        value={(draft.tags ?? []).join(", ")}
                        onChange={(e) => {
                          const parsed = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                          setField("tags", parsed);
                        }}
                        placeholder="leadership, neuroscience"
                      />
                      {(!draft.tags || draft.tags.length === 0) && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> No tags — by-tags related articles won't resolve.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Issue metadata</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="eyebrow-text" className="text-xs">Eyebrow text</Label>
                      <Input
                        id="eyebrow-text"
                        value={draft.eyebrow_text ?? ""}
                        placeholder="Optional kicker above title (e.g. 'Field Notes')"
                        onChange={(e) => setField("eyebrow_text", e.target.value || null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="masthead-pub" className="text-xs">Masthead publication</Label>
                      <Input
                        id="masthead-pub"
                        value={draft.masthead_publication ?? ""}
                        placeholder="Optional — auto-prepends masthead if set"
                        onChange={(e) => setField("masthead_publication", e.target.value || null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="masthead-glyph" className="text-xs">Masthead logo glyph</Label>
                      <Input
                        id="masthead-glyph"
                        value={draft.masthead_logo_glyph ?? ""}
                        placeholder="Optional — single character or emoji"
                        onChange={(e) => setField("masthead_logo_glyph", e.target.value || null)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="is-issue-based"
                        type="checkbox"
                        checked={draft.is_issue_based}
                        onChange={(e) => setField("is_issue_based", e.target.checked)}
                      />
                      <Label htmlFor="is-issue-based" className="text-xs">Issue-based article</Label>
                    </div>
                    {draft.is_issue_based && (
                      <div>
                        <Label htmlFor="issue-label" className="text-xs">Issue label</Label>
                        <Input
                          id="issue-label"
                          value={draft.issue_label ?? ""}
                          placeholder="e.g. 'Issue 14'"
                          onChange={(e) => setField("issue_label", e.target.value || null)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Layout & theme</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="layout-width" className="text-xs">Default layout width</Label>
                      <select
                        id="layout-width"
                        value={draft.default_layout_width}
                        onChange={(e) => setField("default_layout_width", e.target.value as "standard" | "wide" | "narrow")}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="standard">Standard</option>
                        <option value="wide">Wide</option>
                        <option value="narrow">Narrow</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="theme-variant" className="text-xs">Theme variant</Label>
                      <select
                        id="theme-variant"
                        value={draft.theme_variant}
                        onChange={(e) => setField("theme_variant", e.target.value as "default" | "editorial" | "minimal" | "technical")}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="default">Default</option>
                        <option value="editorial">Editorial</option>
                        <option value="minimal">Minimal</option>
                        <option value="technical">Technical</option>
                      </select>
                      <p className="mt-1 text-[10px] text-muted-foreground">CSS responses to theme/width are future work; the value persists today.</p>
                    </div>
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader><CardTitle className="text-sm">Authors</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {draft.author_user_ids.map((aid) => {
                        const u = candidateAuthors?.find((c) => c.id === aid);
                        const name = u?.full_name || u?.email || aid.slice(0, 8);
                        return (
                          <Badge key={aid} variant="secondary" className="gap-1">
                            {name}
                            <button
                              type="button"
                              onClick={() => setField("author_user_ids", draft.author_user_ids.filter((x) => x !== aid))}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">Add author</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0">
                        <div className="max-h-[260px] overflow-y-auto p-1">
                          {(candidateAuthors ?? [])
                            .filter((c) => !draft.author_user_ids.includes(c.id))
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 text-sm"
                                onClick={() => setField("author_user_ids", [...draft.author_user_ids, c.id])}
                              >
                                <div className="font-medium">{c.full_name || "(no name)"}</div>
                                <div className="text-xs text-slate-500">{c.email}</div>
                              </button>
                            ))}
                          {(candidateAuthors ?? []).filter((c) => !draft.author_user_ids.includes(c.id)).length === 0 && (
                            <div className="p-3 text-xs text-slate-400 text-center">No more candidates</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardContent>
                </Card>

                {(status === "draft" || status === "unpublished") && articleId && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Schedule</CardTitle></CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setScheduleOpen(true)}>
                        <CalendarClock className="h-4 w-4" /> Schedule for later
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle className="text-sm">Social preview (OG)</CardTitle></CardHeader>
                  <CardContent>
                    {isCreate ? (
                      <div className="h-[160px] flex items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400 text-center px-4">
                        Save the draft first to enable image uploads.
                      </div>
                    ) : (
                      <div className="min-h-[160px]">
                        <FileUploadField
                          assetKind="image"
                          newsletterArticleId={articleId}
                          refField="og_image"
                          value={draft.og_image_asset_id}
                          onChange={(id) => setField("og_image_asset_id", id)}
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Falls back to cover image if not set. Recommended 1200×630.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-title">SEO title</Label>
                      <Input
                        id="seo-title"
                        value={draft.seo_title}
                        onChange={(e) => setField("seo_title", e.target.value)}
                      />
                      <p className="text-xs text-slate-400">Used in browser tab and search results. Defaults to article title if empty.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-desc">SEO description</Label>
                      <Textarea
                        id="seo-desc"
                        rows={2}
                        value={draft.seo_description}
                        onChange={(e) => setField("seo_description", e.target.value)}
                      />
                      <p className="text-xs text-slate-400">Used in search results and social previews. Defaults to excerpt if empty.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="canonical">Canonical URL</Label>
                      <Input
                        id="canonical"
                        value={draft.canonical_url}
                        onChange={(e) => setField("canonical_url", e.target.value)}
                        placeholder="https://…"
                      />
                      <p className="text-xs text-slate-400">Set if this is a syndicated version of another page.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        {/* Transition confirm dialog */}
        <AlertDialog open={!!transitionDialog} onOpenChange={(open) => { if (!open) { setTransitionDialog(null); setTransitionReason(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{transitionDialog?.title}</AlertDialogTitle>
              <AlertDialogDescription>{transitionDialog?.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="t-reason">Reason (min 10 chars)</Label>
              <Textarea
                id="t-reason"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-slate-400">{transitionReason.trim().length}/10</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={transitioning}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={transitioning || transitionReason.trim().length < 10}
                onClick={(e) => { e.preventDefault(); runTransition(); }}
              >
                {transitioning ? "Working…" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Schedule dialog */}
        <ScheduleDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onSchedule={async (when, reason) => {
            if (!articleIdRef.current) return;
            await flushSave("Pre-transition save: ensuring latest");
            const { data, error } = await supabase.rpc("schedule_article", {
              p_article_id: articleIdRef.current,
              p_publish_at: when.toISOString(),
              p_reason: reason,
            });
            if (error) {
              toast.error(`Schedule failed: ${error.message}`);
              return false;
            }
            const resp = (data ?? {}) as { effective_at_clamped?: boolean };
            toast.success(resp.effective_at_clamped ? "Scheduled (time clamped to now)" : "Scheduled");
            setHydrated(false);
            refreshArticle();
            return true;
          }}
        />

        {articleId && (
          <VersionHistorySheet
            articleId={articleId}
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            currentDraft={{
              body_tiptap: draft.body_tiptap,
              title: draft.title,
              excerpt: draft.excerpt,
            }}
            onRestored={() => {
              setHydrated(false);
              refreshArticle();
            }}
          />
        )}

        {articleId && (
          <ImportHtmlModal
            articleId={articleId}
            open={importOpen}
            onOpenChange={setImportOpen}
            onImported={(newBody) => {
              markDirty();
              setDraft((d) => ({ ...d, body_tiptap: newBody, source_type: "html_import" }));
              // Imperatively update the editor surface — initialContent prop changes don't
              // trigger TipTap to re-render existing instances.
              editorHandleRef.current?.setContent(newBody);
              setTimeout(() => { void flushSave("HTML import: replace body"); }, 0);
              toast.success("Imported", { description: "HTML content is now in the editor." });
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function SaveIndicator({ state, savedAt }: { state: "idle" | "unsaved" | "saving" | "saved"; savedAt: Date | null }) {
  const map = {
    idle: { Icon: Circle, label: "Ready", cls: "text-slate-400 bg-slate-50" },
    unsaved: { Icon: Circle, label: "Unsaved", cls: "text-amber-700 bg-amber-50" },
    saving: { Icon: Loader2, label: "Saving…", cls: "text-teal-700 bg-teal-50" },
    saved: { Icon: Check, label: savedAt ? `Saved ${format(savedAt, "HH:mm:ss")}` : "Saved", cls: "text-slate-500 bg-slate-50" },
  } as const;
  const cfg = map[state];
  const I = cfg.Icon;
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors", cfg.cls)}>
      <I className={cn("h-3 w-3", state === "saving" && "animate-spin")} />
      {cfg.label}
    </div>
  );
}

function StatusPill({
  status,
  onAction,
}: {
  status: Status;
  onAction: (kind: "publish" | "schedule" | "cancel_schedule" | "unpublish" | "archive") => void;
}) {
  const cls = STATUS_BADGE[status];
  const actions: Array<{ label: string; kind: Parameters<typeof onAction>[0]; destructive?: boolean }> = [];
  if (status === "draft") {
    actions.push({ label: "Publish now", kind: "publish" });
    actions.push({ label: "Schedule for later", kind: "schedule" });
    actions.push({ label: "Archive", kind: "archive", destructive: true });
  } else if (status === "scheduled") {
    actions.push({ label: "Publish now", kind: "publish" });
    actions.push({ label: "Cancel scheduling", kind: "cancel_schedule" });
    actions.push({ label: "Archive", kind: "archive", destructive: true });
  } else if (status === "published") {
    actions.push({ label: "Unpublish", kind: "unpublish" });
    actions.push({ label: "Archive", kind: "archive", destructive: true });
  } else if (status === "unpublished") {
    actions.push({ label: "Re-publish", kind: "publish" });
    actions.push({ label: "Schedule for later", kind: "schedule" });
    actions.push({ label: "Archive", kind: "archive", destructive: true });
  }
  if (status === "archived") {
    return (
      <Badge variant="outline" className={cn("capitalize", cls)}>{status}</Badge>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors hover:opacity-90", cls)}>
          {status} <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.kind + a.label}
            onClick={() => onAction(a.kind)}
            className={a.destructive ? "text-destructive focus:text-destructive" : ""}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSchedule: (when: Date, reason: string) => Promise<boolean>;
}) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (!date) return;
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters.");
      return;
    }
    const [hh, mm] = time.split(":").map(Number);
    const when = new Date(date);
    when.setHours(hh ?? 9, mm ?? 0, 0, 0);
    setBusy(true);
    const ok = await onSchedule(when, reason.trim());
    setBusy(false);
    if (ok) {
      onOpenChange(false);
      setDate(undefined);
      setTime("09:00");
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule article</DialogTitle>
          <DialogDescription>
            The article will be published automatically at the selected time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().toDateString())}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-time">Time (local)</Label>
            <Input id="schedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-reason">Reason (min 10 chars)</Label>
            <Textarea id="schedule-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={onConfirm} disabled={busy || !date || reason.trim().length < 10}>
            {busy ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// crude word counter on the TipTap doc
function estimateWordCount(doc: NewsletterTipTapDoc): number {
  let count = 0;
  const walk = (node: { type?: string; text?: string; content?: unknown[] }) => {
    if (node.text) count += node.text.trim().split(/\s+/).filter(Boolean).length;
    if (Array.isArray(node.content)) node.content.forEach((c) => walk(c as { type?: string; text?: string; content?: unknown[] }));
  };
  walk(doc as unknown as { type?: string; text?: string; content?: unknown[] });
  return count;
}
