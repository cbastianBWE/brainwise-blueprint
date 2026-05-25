import { useEffect, useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  GripVertical,
  ListTree,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNewsletterEditorContext } from "../../editor/NewsletterEditorContext";
import {
  resolveRelatedArticles,
  searchAdminArticlesForPicker,
  type AdminRelatedArticleRow,
} from "../../editor/relatedArticles";
import {
  RelatedArticleCardView,
  RelatedArticleCardSkeleton,
  relatedGridClass,
} from "../../editor/RelatedArticleCardView";
import type {
  NewsletterRelatedArticlesAttrs,
  RelatedArticlesMode,
} from "../types";

interface NewsletterCategory {
  id: string;
  slug: string;
  display_name: string;
}

const MODE_OPTIONS: Array<{ value: RelatedArticlesMode; label: string }> = [
  { value: "by_tags", label: "Auto by tags" },
  { value: "by_category", label: "Auto by category" },
  { value: "manual", label: "Manual" },
];

function SortableManualRow({
  id,
  row,
  onRemove,
}: {
  id: string;
  row: AdminRelatedArticleRow | null;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-700"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {row?.title || (
            <span className="italic text-slate-400">Unknown article</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          {row && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {row.status}
            </Badge>
          )}
          {row?.gate && row.gate !== "public" && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {row.gate}
            </Badge>
          )}
          {row?.category_display_name && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {row.category_display_name}
            </Badge>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ManualPickerDialog({
  open,
  onOpenChange,
  existingIds,
  excludeId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  existingIds: string[];
  excludeId: string | null;
  onConfirm: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) {
      setChecked({});
      setSearch("");
      setStatusFilter("all");
    }
  }, [open]);

  const query = useQuery({
    queryKey: ["newsletter-manual-picker", search, statusFilter],
    queryFn: () =>
      searchAdminArticlesForPicker({
        search,
        statusFilter,
        limit: 30,
        excludeId,
      }),
    enabled: open,
  });

  const rows = query.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick related articles</DialogTitle>
          <DialogDescription>
            Choose articles to feature. Only published, public articles will
            appear to readers — drafts and gated articles are silently
            skipped at read time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, excerpt, or slug"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All non-archived</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-md border border-slate-200">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No articles match.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => {
                const alreadySelected = existingIds.includes(row.id);
                const isChecked = !!checked[row.id];
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2",
                      alreadySelected && "bg-slate-50 opacity-60",
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={alreadySelected}
                      onCheckedChange={(v) =>
                        setChecked((p) => ({ ...p, [row.id]: !!v }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {row.title || "Untitled"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {row.status}
                        </Badge>
                        {row.gate && row.gate !== "public" && (
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {row.gate}
                          </Badge>
                        )}
                        {row.category_display_name && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {row.category_display_name}
                          </Badge>
                        )}
                        {alreadySelected && (
                          <span className="text-[10px] italic text-slate-500">
                            already selected
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const newIds = Object.entries(checked)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .filter((id) => !existingIds.includes(id));
              onConfirm(newIds);
              onOpenChange(false);
            }}
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RelatedArticlesNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const ctx = useNewsletterEditorContext();
  const articleId = ctx.articleId;
  const sourceTags = ctx.tags ?? [];
  const sourceCategoryId = ctx.categoryId ?? null;

  const attrs = node.attrs as NewsletterRelatedArticlesAttrs;
  const mode = attrs.mode;
  const max_count = attrs.max_count ?? 3;
  const tag_match_mode = attrs.tag_match_mode ?? "any";
  const title = attrs.title ?? "";
  const manualIds = useMemo(
    () => attrs.manual_article_ids ?? [],
    [attrs.manual_article_ids],
  );

  // ---- Categories (for source-category label) ----
  const categoriesQuery = useQuery<NewsletterCategory[]>({
    queryKey: ["newsletter-categories-active"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.rpc(
        "list_active_newsletter_categories",
      );
      if (error) throw error;
      const items =
        ((data as unknown as { items?: NewsletterCategory[] })?.items ??
          (data as unknown as NewsletterCategory[])) ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const sourceCategoryName =
    sourceCategoryId && categoriesQuery.data
      ? categoriesQuery.data.find((c) => c.id === sourceCategoryId)
          ?.display_name ?? null
      : null;

  // ---- Manual-mode selected article metadata ----
  const manualMetaQuery = useQuery({
    queryKey: ["newsletter-manual-meta", manualIds.join(",")],
    enabled: mode === "manual" && manualIds.length > 0,
    queryFn: async () => {
      const resp = await searchAdminArticlesForPicker({
        limit: 50,
      });
      const byId = new Map(resp.items.map((it) => [it.id, it]));
      return manualIds.map((id) => byId.get(id) ?? null);
    },
  });

  // ---- Live preview ----
  const previewQuery = useQuery({
    queryKey: [
      "newsletter-related-preview",
      articleId,
      mode,
      max_count,
      tag_match_mode,
      manualIds.join(","),
    ],
    enabled: !!articleId,
    queryFn: () =>
      resolveRelatedArticles({
        mode,
        sourceArticleId: articleId,
        maxCount: max_count,
        tagMatchMode: tag_match_mode,
        manualArticleIds: manualIds,
      }),
  });

  // ---- Picker dialog ----
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---- dnd sensors for manual list ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = manualIds.indexOf(active.id as string);
    const to = manualIds.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    updateAttributes({
      manual_article_ids: arrayMove(manualIds, from, to),
    });
  };

  const handleModeChange = (next: RelatedArticlesMode) => {
    updateAttributes({
      mode: next,
      manual_article_ids: next === "manual" ? [] : null,
      tag_match_mode: next === "by_tags" ? (tag_match_mode || "any") : null,
    });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-related-articles-editor="true"
      data-drag-handle
      className={cn(
        "group/nl-rel relative my-6 rounded-lg border bg-white p-4",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/40"
          : "border-slate-200 hover:border-slate-300",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        aria-label="Delete related articles"
        className="absolute right-2 top-2 z-10 rounded-full p-1 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/nl-rel:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <ListTree className="h-3.5 w-3.5" />
            Related articles
          </div>
          <div
            className="inline-flex items-center rounded-full bg-slate-100 p-0.5 text-xs"
            role="tablist"
          >
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleModeChange(opt.value)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  mode === opt.value
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) =>
            updateAttributes({
              title: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="Section title (optional, default 'Related articles')"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F5741A] focus:outline-none"
        />
      </header>

      <div className="my-4 space-y-3">
        {mode === "by_tags" && (
          <ModeByTagsConfig
            sourceTags={sourceTags}
            maxCount={max_count}
            tagMatchMode={tag_match_mode}
            onMaxCountChange={(n) => updateAttributes({ max_count: n })}
            onTagMatchModeChange={(m) =>
              updateAttributes({ tag_match_mode: m })
            }
          />
        )}
        {mode === "by_category" && (
          <ModeByCategoryConfig
            sourceCategoryId={sourceCategoryId}
            sourceCategoryName={sourceCategoryName}
            maxCount={max_count}
            onMaxCountChange={(n) => updateAttributes({ max_count: n })}
          />
        )}
        {mode === "manual" && (
          <ModeManualConfig
            manualIds={manualIds}
            manualMeta={manualMetaQuery.data ?? null}
            maxCount={max_count}
            onMaxCountChange={(n) => updateAttributes({ max_count: n })}
            sensors={sensors}
            onDragEnd={handleDragEnd}
            onRemove={(id) =>
              updateAttributes({
                manual_article_ids: manualIds.filter((x) => x !== id),
              })
            }
            onOpenPicker={() => setPickerOpen(true)}
          />
        )}
      </div>

      <hr className="my-4 border-slate-100" />

      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Preview
        </div>
        {previewQuery.isLoading ? (
          <div className={relatedGridClass(max_count)}>
            {Array.from({ length: Math.min(3, max_count) }).map((_, i) => (
              <RelatedArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : previewQuery.isError ? (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
            Could not load preview. {(previewQuery.error as Error)?.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (previewQuery.data ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-xs italic text-slate-500">
            No matching articles will be shown to readers at this time.
            {mode === "by_tags" &&
              " Try expanding the tag match mode or add more tags to this article."}
            {mode === "by_category" &&
              " Make sure this article has a category assigned and other published articles share it."}
            {mode === "manual" &&
              " Add articles using the picker above."}
          </div>
        ) : (
          <div className={relatedGridClass(max_count)}>
            {(previewQuery.data ?? []).map((card) => (
              <RelatedArticleCardView key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>

      <ManualPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingIds={manualIds}
        excludeId={articleId || null}
        onConfirm={(newIds) =>
          updateAttributes({
            manual_article_ids: [...manualIds, ...newIds],
          })
        }
      />
    </NodeViewWrapper>
  );
}

// ============================================================
// Mode-specific config panels
// ============================================================

function MaxCountSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-medium">Max</span>
      <input
        type="number"
        min={1}
        max={12}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) {
            onChange(Math.max(1, Math.min(12, n)));
          }
        }}
        className="h-7 w-16 rounded border border-slate-200 px-2 text-xs"
      />
      <span className="text-slate-400">articles (1–12)</span>
    </label>
  );
}

function ModeByTagsConfig({
  sourceTags,
  maxCount,
  tagMatchMode,
  onMaxCountChange,
  onTagMatchModeChange,
}: {
  sourceTags: string[];
  maxCount: number;
  tagMatchMode: "any" | "all" | null;
  onMaxCountChange: (n: number) => void;
  onTagMatchModeChange: (m: "any" | "all") => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <MaxCountSlider value={maxCount} onChange={onMaxCountChange} />
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5 text-[11px]">
          {(["any", "all"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onTagMatchModeChange(m)}
              className={cn(
                "rounded-full px-2.5 py-0.5",
                tagMatchMode === m
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-500",
              )}
            >
              {m === "any" ? "Match any tag" : "Match all tags"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <span>Source article tags:</span>
        {sourceTags.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            none — set tags in article metadata to enable.
          </span>
        ) : (
          sourceTags.map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              {t}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function ModeByCategoryConfig({
  sourceCategoryId,
  sourceCategoryName,
  maxCount,
  onMaxCountChange,
}: {
  sourceCategoryId: string | null;
  sourceCategoryName: string | null;
  maxCount: number;
  onMaxCountChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <MaxCountSlider value={maxCount} onChange={onMaxCountChange} />
      <div className="text-[11px] text-slate-500">
        {sourceCategoryId ? (
          <>
            Source article category:{" "}
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {sourceCategoryName ?? "(loading…)"}
            </Badge>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            This article has no category assigned. Set one in the article
            metadata to enable category-based related articles.
          </span>
        )}
      </div>
    </div>
  );
}

function ModeManualConfig({
  manualIds,
  manualMeta,
  maxCount,
  onMaxCountChange,
  sensors,
  onDragEnd,
  onRemove,
  onOpenPicker,
}: {
  manualIds: string[];
  manualMeta: (AdminRelatedArticleRow | null)[] | null;
  maxCount: number;
  onMaxCountChange: (n: number) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  onRemove: (id: string) => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] italic text-slate-500">
        Manually pick articles to feature. Only published, public articles will
        appear to readers — drafts and gated articles are silently skipped at
        read time.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <MaxCountSlider value={maxCount} onChange={onMaxCountChange} />
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPicker}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add article
        </Button>
      </div>
      {manualIds.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={manualIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {manualIds.map((id, i) => (
                <SortableManualRow
                  key={id}
                  id={id}
                  row={manualMeta?.[i] ?? null}
                  onRemove={() => onRemove(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
