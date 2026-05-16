import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Menu,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useLessonBlockAssets } from "@/hooks/useLessonBlockAssets";
import {
  BlockRenderer,
  type OnBlockComplete,
  type SavedBlockProgress,
} from "@/components/super-admin/lesson-blocks/BlockRenderer";
import {
  BLOCK_TYPE_META,
  type BlockType,
  type EditorBlock,
} from "@/components/super-admin/lesson-blocks/blockTypeMeta";
import "@/components/super-admin/lesson-blocks/lesson-blocks.css";
import type { CascadeResult } from "@/hooks/useCompletionReporter";

/* ---------- types ---------- */

type LessonCompletionMode = "explicit_continue" | "scroll_and_checks";

const INTERACTIVE_TYPES: ReadonlySet<BlockType> = new Set([
  "knowledge_check",
  "flashcards",
  "card_sort",
  "scenario",
]);

interface LessonBlockRow {
  id: string;
  block_type: BlockType;
  display_order: number;
  config: Record<string, unknown>;
}

interface Props {
  contentItem: any;
  completion: any | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ ok: boolean; cascade: CascadeResult | null; error?: string }>;
  reportProgress: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string; result?: unknown }>;
  isReporting: boolean;
  onCascade?: (c: CascadeResult | null) => void;
}

/* ---------- viewer ---------- */

export default function LessonBlockViewer({
  contentItem,
  completion,
  viewerRole,
  reportCompletion,
  reportProgress,
  isReporting,
}: Props) {
  const queryClient = useQueryClient();
  const contentItemId: string = contentItem.id;
  const completionMode: LessonCompletionMode =
    (contentItem.lesson_completion_mode as LessonCompletionMode | undefined) ??
    "explicit_continue";
  const isCompleted = completion?.status === "completed";
  const isSelf = viewerRole === "self";

  /* ---- data ---- */

  const blocksQuery = useQuery({
    queryKey: ["lesson-blocks", contentItemId],
    enabled: !!contentItemId,
    queryFn: async (): Promise<LessonBlockRow[]> => {
      const { data, error } = await supabase
        .from("lesson_blocks")
        .select("id, block_type, display_order, config")
        .eq("content_item_id", contentItemId)
        .is("archived_at", null)
        .order("display_order");
      if (error) throw error;
      return ((data as any[]) ?? []) as LessonBlockRow[];
    },
  });

  const { urlMap, isLoading: assetsLoading } = useLessonBlockAssets(contentItemId);

  /* ---- DB-backed per-block progress (single source of truth) ---- */

  const blockProgressQuery = useQuery({
    queryKey: ["lesson-block-progress", contentItemId],
    enabled: !!contentItemId && isSelf,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return [] as Array<{ block_id: string; status: string; completion_data: unknown }>;
      const { data, error } = await supabase
        .from("lesson_block_progress")
        .select("block_id, status, completion_data")
        .eq("content_item_id", contentItemId)
        .eq("user_id", uid);
      if (error) throw error;
      return (data ?? []) as Array<{ block_id: string; status: string; completion_data: unknown }>;
    },
  });

  const savedProgressByBlockId = useMemo(() => {
    const m = new Map<string, SavedBlockProgress>();
    for (const row of blockProgressQuery.data ?? []) {
      if (row.status === "completed" || row.status === "in_progress") {
        m.set(row.block_id, {
          status: row.status,
          completion_data: row.completion_data,
        });
      }
    }
    return m;
  }, [blockProgressQuery.data]);

  /* ---- state ---- */

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [showMoreHint, setShowMoreHint] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [tocOpenMobile, setTocOpenMobile] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setBlockRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(id, el);
    else blockRefs.current.delete(id);
  }, []);

  const blocks = blocksQuery.data ?? [];
  const editorBlocks: EditorBlock[] = useMemo(
    () =>
      blocks.map((b) => ({
        client_id: b.id,
        block_type: b.block_type,
        config: b.config ?? {},
      })),
    [blocks],
  );

  /* ---- seed completedIds from DB on (re)load ---- */

  const seededProgressRef = useRef(false);
  useEffect(() => {
    if (seededProgressRef.current) return;
    if (blockProgressQuery.isLoading) return;
    seededProgressRef.current = true;
    const next = new Set<string>();
    for (const row of blockProgressQuery.data ?? []) {
      if (row.status === "completed") next.add(row.block_id);
    }
    if (next.size > 0) setCompletedIds(next);
  }, [blockProgressQuery.isLoading, blockProgressQuery.data]);

  /* ---- per-block completion (live transitions only) ---- */
  // Renderer fires this only on a live false → true transition, with a state
  // snapshot. We update the in-memory gating set AND persist to DB via
  // reportProgress. Already-complete blocks are handled by the seed above —
  // not by this callback.

  const handleBlockComplete = useCallback<OnBlockComplete>(
    (blockId, completionData) => {
      setCompletedIds((prev) => {
        if (prev.has(blockId)) return prev;
        const next = new Set(prev);
        next.add(blockId);
        return next;
      });
      if (!isSelf) return;
      reportProgress("upsert_lesson_block_progress", {
        p_block_id: blockId,
        p_status: "completed",
        p_completion_data: completionData ?? {},
      });
    },
    [isSelf, reportProgress],
  );

  /* ---- furthest-position tracking (debounced) ---- */

  const positionTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isSelf || !activeBlockId) return;
    if (positionTimerRef.current) window.clearTimeout(positionTimerRef.current);
    positionTimerRef.current = window.setTimeout(() => {
      reportProgress("upsert_lesson_progress", {
        p_content_item_id: contentItemId,
        p_furthest_continue_client_id: activeBlockId,
        p_last_block_id: activeBlockId,
      });
    }, 800);
    return () => {
      if (positionTimerRef.current) window.clearTimeout(positionTimerRef.current);
    };
  }, [activeBlockId, contentItemId, isSelf, reportProgress]);

  /* ---- scroll tracking: active block + bottom + more-hint ---- */

  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root || blocks.length === 0) return;

    const findScroller = (): HTMLElement | Window => {
      let el: HTMLElement | null = root.parentElement;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return window;
    };
    const scroller = findScroller();

    const compute = () => {
      // bottom + more-hint based on scroll container
      if (scroller === window) {
        const sh = document.documentElement.scrollHeight;
        const ch = window.innerHeight;
        const st = window.scrollY;
        const atBottom = st + ch >= sh - 24;
        setScrolledToBottom(atBottom);
        setShowMoreHint(!atBottom);
      } else {
        const el = scroller as HTMLElement;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
        setScrolledToBottom(atBottom);
        setShowMoreHint(!atBottom);
      }
      // active block: topmost block whose top is past the viewport top
      const containerTop =
        scroller === window
          ? 0
          : (scroller as HTMLElement).getBoundingClientRect().top;
      let bestId: string | null = null;
      let bestDelta = Number.POSITIVE_INFINITY;
      for (const b of blocks) {
        const el = blockRefs.current.get(b.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const delta = Math.abs(rect.top - containerTop - 80);
        if (rect.top - containerTop < 200 && delta < bestDelta) {
          bestDelta = delta;
          bestId = b.id;
        }
      }
      if (bestId) setActiveBlockId(bestId);
    };

    compute();
    const target: any = scroller;
    target.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      target.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [blocks]);

  /* ---- resume on mount ---- */

  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || blocks.length === 0) return;
    const targetId = completion?.lesson_last_block_id as string | undefined;
    if (!targetId) {
      resumedRef.current = true;
      return;
    }
    const el = blockRefs.current.get(targetId);
    if (el) {
      resumedRef.current = true;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [blocks, completion]);

  /* ---- gating logic ---- */

  const gatingRequiredBlockIds = useMemo(
    () =>
      new Set(
        blocks
          .filter(
            (b) =>
              INTERACTIVE_TYPES.has(b.block_type) &&
              (b.config as any)?.gating_required === true,
          )
          .map((b) => b.id),
      ),
    [blocks],
  );

  const allGatedComplete = useMemo(() => {
    for (const id of gatingRequiredBlockIds) {
      if (!completedIds.has(id)) return false;
    }
    return true;
  }, [gatingRequiredBlockIds, completedIds]);

  const finalContinueEnabled =
    allGatedComplete &&
    (completionMode === "explicit_continue" ? true : scrolledToBottom);

  /* ---- handlers ---- */

  const [isCompleting, setIsCompleting] = useState(false);
  const handleFinalContinue = async () => {
    if (!isSelf || isCompleted) return;
    setIsCompleting(true);
    await reportCompletion("complete_lesson", { p_content_item_id: contentItemId });
    setIsCompleting(false);
  };

  const handleReattempt = async () => {
    if (!isSelf) return;
    await reportCompletion("start_lesson_reattempt", {
      p_content_item_id: contentItemId,
    });
    setCompletedIds(new Set());
    seededProgressRef.current = false;
    resumedRef.current = false;
    await queryClient.invalidateQueries({ queryKey: ["lesson-blocks", contentItemId] });
    await queryClient.invalidateQueries({
      queryKey: ["lesson-block-progress", contentItemId],
    });
  };

  const scrollToBlock = (id: string) => {
    const el = blockRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpenMobile(false);
  };

  /* ---- render ---- */

  if (blocksQuery.isLoading || assetsLoading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blocksQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-card p-6 text-sm text-destructive">
        Could not load this lesson. Please try again.
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        This lesson has no content yet.
      </div>
    );
  }

  /* ---- TOC ---- */

  const Toc = (
    <nav className="space-y-1 p-2 text-sm" aria-label="Lesson contents">
      <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Contents
      </div>
      {blocks.map((b) => {
        const meta = BLOCK_TYPE_META[b.block_type];
        const Icon = meta?.icon;
        const required = gatingRequiredBlockIds.has(b.id);
        const done = completedIds.has(b.id);
        const active = activeBlockId === b.id;
        return (
          <button
            key={b.id}
            onClick={() => scrollToBlock(b.id)}
            className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span className="flex-1 truncate text-xs">{meta?.label ?? b.block_type}</span>
            {required && (
              <span className="rounded-full bg-[var(--bw-orange)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bw-orange)]">
                Req
              </span>
            )}
            {done && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--bw-forest)]" />
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="relative">
      {/* Mobile TOC trigger */}
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <Sheet open={tocOpenMobile} onOpenChange={setTocOpenMobile}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="mr-2 h-4 w-4" />
              Contents
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-sm font-semibold">Lesson contents</div>
              <button
                onClick={() => setTocOpenMobile(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {Toc}
          </SheetContent>
        </Sheet>
        {isCompleted && isSelf && (
          <Button variant="ghost" size="sm" onClick={handleReattempt}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start again
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border bg-card">
            {Toc}
            {isCompleted && isSelf && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReattempt}
                  className="w-full justify-start"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start again
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Lesson body */}
        <div ref={scrollAreaRef} className="relative min-w-0 space-y-6">
          {editorBlocks.map((eb, idx) => {
            const row = blocks[idx];
            const required = gatingRequiredBlockIds.has(row.id);
            const done = completedIds.has(row.id);
            const isLast = idx === editorBlocks.length - 1;
            const nextRow = blocks[idx + 1];
            const showPerBlockContinue =
              INTERACTIVE_TYPES.has(row.block_type) &&
              required &&
              done &&
              !isLast;
            return (
              <div
                key={row.id}
                ref={(el) => setBlockRef(row.id, el)}
                data-block-id={row.id}
                className="scroll-mt-20"
              >
                <BlockRenderer
                  block={eb}
                  assetUrlMap={urlMap}
                  mode="trainee"
                  onBlockComplete={handleBlockComplete}
                  savedProgress={savedProgressByBlockId.get(row.id) ?? null}
                />
                {showPerBlockContinue && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => nextRow && scrollToBlock(nextRow.id)}
                      className="bg-[var(--bw-orange)] text-white hover:bg-[var(--bw-orange-600)]"
                    >
                      Continue
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Final continue */}
          <div className="border-t pt-6">
            {!isCompleted && isSelf && (
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {allGatedComplete
                    ? completionMode === "scroll_and_checks" && !scrolledToBottom
                      ? "Scroll to the end of the lesson to finish."
                      : "You've completed every required activity."
                    : "Complete the required activities above to finish this lesson."}
                </div>
                <Button
                  size="lg"
                  disabled={!finalContinueEnabled || isCompleting || isReporting}
                  onClick={handleFinalContinue}
                  className="bg-[var(--bw-orange)] text-white hover:bg-[var(--bw-orange-600)]"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Complete lesson"
                  )}
                </Button>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center justify-between rounded-md border border-[var(--bw-forest)]/30 bg-[var(--bw-forest)]/5 p-3 text-sm">
                <span className="flex items-center gap-2 text-[var(--bw-forest)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Lesson complete.
                </span>
                {isSelf && (
                  <Button variant="ghost" size="sm" onClick={handleReattempt}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start again
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Local "more below" affordance */}
          {showMoreHint && (
            <div
              className="pointer-events-none sticky bottom-0 -mt-8 flex h-12 items-end justify-center bg-gradient-to-t from-background to-transparent pb-1"
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4 animate-bounce text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
