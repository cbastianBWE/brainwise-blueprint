import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { CurrentDraft, VersionListItem, VersionListResponse } from "./types";
import { VERSION_TYPE_BADGE, VERSION_TYPE_LABEL } from "./versionBadgeStyles";
import SaveSnapshotDialog from "./SaveSnapshotDialog";
import VersionDiffPanel from "./VersionDiffPanel";

interface VersionHistorySheetProps {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDraft: CurrentDraft;
  onRestored: () => void;
}

type Row =
  | { kind: "landmark"; item: VersionListItem }
  | { kind: "draft-group"; items: VersionListItem[]; key: string };

interface DayGroup {
  key: string;
  label: string;
  rows: Row[];
}

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function dayLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "PPPP");
}

function groupVersions(items: VersionListItem[]): DayGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const byDay = new Map<string, { label: string; items: VersionListItem[] }>();
  for (const it of sorted) {
    const d = new Date(it.created_at);
    const k = dayKey(d);
    if (!byDay.has(k)) byDay.set(k, { label: dayLabel(d), items: [] });
    byDay.get(k)!.items.push(it);
  }

  const groups: DayGroup[] = [];
  for (const [k, { label, items: dayItems }] of byDay) {
    const rows: Row[] = [];
    let draftBuf: VersionListItem[] = [];
    const flushDrafts = () => {
      if (draftBuf.length) {
        rows.push({
          kind: "draft-group",
          items: draftBuf,
          key: `drafts-${k}-${rows.length}`,
        });
        draftBuf = [];
      }
    };
    for (const it of dayItems) {
      if (it.version_type === "draft") {
        draftBuf.push(it);
      } else {
        flushDrafts();
        rows.push({ kind: "landmark", item: it });
      }
    }
    flushDrafts();
    groups.push({ key: k, label, rows });
  }
  return groups;
}

export default function VersionHistorySheet({
  articleId,
  open,
  onOpenChange,
  currentDraft,
  onRestored,
}: VersionHistorySheetProps) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [expandedDraftGroups, setExpandedDraftGroups] = useState<Set<string>>(new Set());
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["newsletter-article-versions", articleId],
    enabled: open && !!articleId,
    queryFn: async (): Promise<VersionListResponse> => {
      const { data, error } = await supabase.rpc("list_article_versions", {
        p_article_id: articleId,
      });
      if (error) throw error;
      const resp = (data as unknown as VersionListResponse) ?? {
        items: [],
        total: 0,
        capped: false,
      };
      return resp;
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const capped = data?.capped ?? false;
  const publishedCount = items.filter((i) => i.version_type === "published").length;

  const groups = useMemo(() => groupVersions(items), [items]);

  // Flat list of *visible* version IDs for keyboard nav
  const visibleVersionIds = useMemo(() => {
    const ids: string[] = [];
    for (const g of groups) {
      for (const row of g.rows) {
        if (row.kind === "landmark") {
          ids.push(row.item.version_id);
        } else if (expandedDraftGroups.has(row.key)) {
          for (const d of row.items) ids.push(d.version_id);
        }
      }
    }
    return ids;
  }, [groups, expandedDraftGroups]);

  useEffect(() => {
    if (!open) {
      setSelectedVersionId(null);
      setExpandedDraftGroups(new Set());
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (visibleVersionIds.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = selectedVersionId
          ? visibleVersionIds.indexOf(selectedVersionId)
          : -1;
        const next =
          e.key === "ArrowDown"
            ? Math.min(visibleVersionIds.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        setSelectedVersionId(visibleVersionIds[next]);
      }
    },
    [visibleVersionIds, selectedVersionId],
  );

  const toggleDraftGroup = (key: string) => {
    setExpandedDraftGroups((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const refetchVersions = () => {
    queryClient.invalidateQueries({ queryKey: ["newsletter-article-versions", articleId] });
  };

  const handleRestored = () => {
    refetchVersions();
    onRestored();
    onOpenChange(false);
  };

  const wide = !!selectedVersionId;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "p-0 flex flex-col gap-0 transition-[max-width,width] duration-200 ease-out",
            wide ? "!w-[960px] sm:!max-w-[960px]" : "!w-[400px] sm:!max-w-[400px]",
          )}
        >
          <SheetHeader className="px-5 py-4 border-b border-slate-200 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="font-display text-lg">Version history</SheetTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {total} {total === 1 ? "version" : "versions"} saved · {publishedCount} published{" "}
                  {publishedCount === 1 ? "landmark" : "landmarks"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSnapshotDialogOpen(true)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" /> Save snapshot
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 flex">
            {/* Left pane: list */}
            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="w-[320px] shrink-0 flex flex-col min-h-0 outline-none focus:ring-0"
            >
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    No version history yet
                  </div>
                ) : (
                  <div className="py-2">
                    {groups.map((g) => (
                      <div key={g.key} className="mb-3">
                        <div className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-display text-slate-400">
                          {g.label}
                        </div>
                        <div className="space-y-0.5 px-2">
                          {g.rows.map((row) => {
                            if (row.kind === "landmark") {
                              return (
                                <LandmarkRow
                                  key={row.item.version_id}
                                  item={row.item}
                                  selected={selectedVersionId === row.item.version_id}
                                  onSelect={() => setSelectedVersionId(row.item.version_id)}
                                />
                              );
                            }
                            const expanded = expandedDraftGroups.has(row.key);
                            return (
                              <div key={row.key}>
                                <button
                                  type="button"
                                  onClick={() => toggleDraftGroup(row.key)}
                                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded"
                                >
                                  {expanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  {row.items.length} draft auto-save{row.items.length === 1 ? "" : "s"}
                                </button>
                                {expanded && (
                                  <div className="ml-4 space-y-0.5">
                                    {row.items.map((d) => (
                                      <DraftRow
                                        key={d.version_id}
                                        item={d}
                                        selected={selectedVersionId === d.version_id}
                                        onSelect={() => setSelectedVersionId(d.version_id)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {capped && (
                      <div className="px-4 py-3 text-[11px] text-slate-400 border-t border-slate-100 mt-2">
                        Showing 200 most recent versions. Older versions exist but aren't loaded.
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right pane: diff */}
            {wide && selectedVersionId && (
              <VersionDiffPanel
                versionId={selectedVersionId}
                articleId={articleId}
                currentDraft={currentDraft}
                onRestored={handleRestored}
              />
            )}
            {wide && !selectedVersionId && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 border-l border-slate-200">
                Select a version to compare
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {snapshotDialogOpen && (
        <SaveSnapshotDialog
          articleId={articleId}
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
          onSaved={refetchVersions}
        />
      )}
    </>
  );
}

function LandmarkRow({
  item,
  selected,
  onSelect,
}: {
  item: VersionListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const time = format(new Date(item.created_at), "h:mm a");
  const label =
    item.version_name ||
    (item.version_type === "restored_from"
      ? `Restored from v${item.version_number}`
      : item.version_type === "published"
        ? `Published v${item.version_number}`
        : item.version_type === "scheduled"
          ? `Scheduled v${item.version_number}`
          : `v${item.version_number}`);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2 rounded transition-colors relative",
        "hover:bg-slate-50",
        selected && "bg-orange-50/30",
      )}
      style={selected ? { boxShadow: "inset 4px 0 0 var(--bw-orange)" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">{label}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {time} · {item.created_by_display_name ?? "Unknown"}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("text-[10px] py-0 px-1.5 shrink-0", VERSION_TYPE_BADGE[item.version_type])}
        >
          {VERSION_TYPE_LABEL[item.version_type]}
        </Badge>
      </div>
    </button>
  );
}

function DraftRow({
  item,
  selected,
  onSelect,
}: {
  item: VersionListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const time = format(new Date(item.created_at), "h:mm a");
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-1 rounded text-xs text-slate-500 hover:bg-slate-50 transition-colors",
        selected && "bg-orange-50/30",
      )}
      style={selected ? { boxShadow: "inset 4px 0 0 var(--bw-orange)" } : undefined}
    >
      {time} · {item.created_by_display_name ?? "Unknown"}
    </button>
  );
}
