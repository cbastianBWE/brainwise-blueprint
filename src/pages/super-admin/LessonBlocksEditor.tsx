import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, Edit2, Layers, Loader2, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
import { StackedLessonEditor, type EditorMode } from "@/components/super-admin/lesson-blocks/StackedLessonEditor";
import { EditorSlidePane } from "@/components/super-admin/lesson-blocks/EditorSlidePane";
import { ManageBlocksSidebar, type BlockPadding } from "@/components/super-admin/lesson-blocks/ManageBlocksSidebar";
import { UndoDeleteToast } from "@/components/super-admin/lesson-blocks/UndoDeleteToast";
import { AddBlockPopover } from "@/components/super-admin/lesson-blocks/AddBlockPopover";
import {
  BLOCK_TYPE_META,
  type BlockType,
  type EditorBlock,
} from "@/components/super-admin/lesson-blocks/blockTypeMeta";
import { useLessonBlockDraft } from "@/components/super-admin/lesson-blocks/useLessonBlockDraft";
import { useLessonBlockAssetUrls } from "@/components/super-admin/lesson-blocks/useLessonBlockAssetUrls";
import "@/components/super-admin/lesson-blocks/lesson-blocks.css";

function rowsToEditorBlocks(rows: any[]): EditorBlock[] {
  return rows.map((r) => ({
    client_id: r.id as string,
    block_type: r.block_type as BlockType,
    config: (r.config ?? {}) as Record<string, unknown>,
  }));
}

function stripIdsForRpc(blocks: EditorBlock[]) {
  return blocks.map((b) => ({ block_type: b.block_type, config: b.config }));
}

export default function LessonBlocksEditor() {
  const { contentItemId } = useParams<{ contentItemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [initialBlocks, setInitialBlocks] = useState<EditorBlock[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deletedBlock, setDeletedBlock] = useState<{
    block: EditorBlock;
    index: number;
  } | null>(null);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [lastClickedClientId, setLastClickedClientId] = useState<string | null>(null);
  const [bulkDeletedBlocks, setBulkDeletedBlocks] = useState<
    { block: EditorBlock; index: number }[] | null
  >(null);

  const itemQuery = useQuery({
    queryKey: ["lesson-blocks-editor-item", contentItemId],
    enabled: !!contentItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, title, item_type, archived_at")
        .eq("id", contentItemId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (itemQuery.isLoading || !contentItemId) return;
    const item = itemQuery.data as any;
    if (!item || item.archived_at || item.item_type !== "lesson_blocks") {
      toast({
        title: "Not editable",
        description: "That content item is not editable as lesson blocks.",
        variant: "destructive",
      });
      navigate("/super-admin/content-authoring", { replace: true });
    }
  }, [itemQuery.isLoading, itemQuery.data, contentItemId, navigate, toast]);

  const [draftRow, setDraftRow] = useState<any | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!contentItemId || !itemQuery.data || (itemQuery.data as any).item_type !== "lesson_blocks") return;
    (async () => {
      const { data: rows, error } = await supabase
        .from("lesson_blocks" as any)
        .select("*")
        .eq("content_item_id", contentItemId)
        .is("archived_at", null)
        .order("display_order", { ascending: true });
      if (error) {
        toast({ title: "Failed to load blocks", description: error.message, variant: "destructive" });
        return;
      }
      const canonical = rowsToEditorBlocks((rows as any[]) ?? []);
      if (cancelled) return;

      const { data: { user } } = await supabase.auth.getUser();
      let draft: any | null = null;
      if (user) {
        const { data: d } = await supabase
          .from("lesson_block_drafts" as any)
          .select("*")
          .eq("content_item_id", contentItemId)
          .eq("author_id", user.id)
          .maybeSingle();
        draft = d ?? null;
      }
      if (cancelled) return;

      setDraftRow(draft);
      if (draft) setShowDraftBanner(true);
      setBlocks(canonical);
      setInitialBlocks(canonical);
      setLoaded(true);
      setTimeout(() => setDraftEnabled(true), 100);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentItemId, itemQuery.data, toast]);

  const isDirty = useMemo(() => {
    const normalize = (v: any): any => {
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) return v.map(normalize).filter((x) => x !== undefined);
      if (typeof v === "object") {
        const out: any = {};
        for (const k of Object.keys(v).sort()) {
          const nv = normalize(v[k]);
          if (nv === undefined) continue;
          if (Array.isArray(nv) && nv.length === 0) continue;
          if (nv === null || nv === "") continue;
          out[k] = nv;
        }
        return out;
      }
      return v;
    };
    return JSON.stringify(normalize(blocks)) !== JSON.stringify(normalize(initialBlocks));
  }, [blocks, initialBlocks]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setPendingNavigation("__browser_back__");
      setShowLeaveDialog(true);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const guardedNavigate = useCallback((to: string) => {
    if (isDirty) {
      setPendingNavigation(to);
      setShowLeaveDialog(true);
    } else {
      navigate(to);
    }
  }, [isDirty, navigate]);

  const draftStatus = useLessonBlockDraft({
    contentItemId: contentItemId ?? "",
    blocks,
    enabled: !!contentItemId && draftEnabled,
  });

  const { urlMap: assetUrlMap, registerNewAssetId } = useLessonBlockAssetUrls(contentItemId);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveReason, setSaveReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveAndNavigateTo, setSaveAndNavigateTo] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!contentItemId) return;
    const { data: rows, error } = await supabase
      .from("lesson_blocks" as any)
      .select("*")
      .eq("content_item_id", contentItemId)
      .is("archived_at", null)
      .order("display_order", { ascending: true });
    if (error) throw error;
    const next = rowsToEditorBlocks((rows as any[]) ?? []);
    // Preserve selection by display_order — IDs change on Save.
    let nextSelected: string | null = null;
    if (selectedClientId) {
      const prevIndex = blocks.findIndex((b) => b.client_id === selectedClientId);
      if (prevIndex >= 0 && prevIndex < next.length) {
        nextSelected = next[prevIndex].client_id;
      }
    }
    setBlocks(next);
    setInitialBlocks(next);
    if (nextSelected) {
      setSelectedClientId(nextSelected);
    } else {
      setSelectedClientId(null);
      setPaneOpen(false);
    }
  }, [contentItemId, selectedClientId, blocks]);

  const handleSave = async () => {
    if (!contentItemId) return;
    if (saveReason.trim().length < 10) return;
    setSaving(true);
    draftStatus.pause();
    try {
      const { error } = await supabase.rpc("replace_lesson_blocks" as any, {
        p_content_item_id: contentItemId,
        p_blocks: stripIdsForRpc(blocks),
        p_reason: saveReason.trim(),
      });
      if (error) throw error;
      toast({ title: "Lesson blocks saved." });
      setSaveDialogOpen(false);
      setSaveReason("");
      await reload();
      setSelectedClientIds(new Set());
      setLastClickedClientId(null);
      draftStatus.resume();
      if (saveAndNavigateTo) {
        const target = saveAndNavigateTo;
        setSaveAndNavigateTo(null);
        if (target === "__browser_back__") {
          window.history.back();
        } else {
          navigate(target);
        }
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message ?? String(e), variant: "destructive" });
      draftStatus.resume();
      setSaveAndNavigateTo(null);
    } finally {
      setSaving(false);
    }
  };

  // Mutators
  const handleSelectBlock = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedClientIds(new Set([clientId]));
    setLastClickedClientId(clientId);
    setPaneOpen(true);
  };

  const handleToggleSelect = (clientId: string, e: React.MouseEvent) => {
    if (mode !== "manage") return;
    if (e.shiftKey && lastClickedClientId) {
      const startIdx = blocks.findIndex((b) => b.client_id === lastClickedClientId);
      const endIdx = blocks.findIndex((b) => b.client_id === clientId);
      if (startIdx >= 0 && endIdx >= 0) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const next = new Set(selectedClientIds);
        for (let i = lo; i <= hi; i++) next.add(blocks[i].client_id);
        setSelectedClientIds(next);
        setLastClickedClientId(clientId);
        return;
      }
    }
    const next = new Set(selectedClientIds);
    if (next.has(clientId)) next.delete(clientId);
    else next.add(clientId);
    setSelectedClientIds(next);
    setLastClickedClientId(clientId);
  };

  const handleBulkSelectAll = () => {
    setSelectedClientIds(new Set(blocks.map((b) => b.client_id)));
  };
  const handleBulkClearSelection = () => {
    setSelectedClientIds(new Set());
    setLastClickedClientId(null);
  };

  const handleBulkDelete = () => {
    if (selectedClientIds.size === 0) return;
    const removed: { block: EditorBlock; index: number }[] = [];
    blocks.forEach((b, i) => {
      if (selectedClientIds.has(b.client_id)) removed.push({ block: b, index: i });
    });
    removed.sort((a, b) => a.index - b.index);
    setBlocks((prev) => prev.filter((b) => !selectedClientIds.has(b.client_id)));
    setBulkDeletedBlocks(removed);
    setSelectedClientIds(new Set());
    setLastClickedClientId(null);
  };

  const handleUndoBulkDelete = () => {
    if (!bulkDeletedBlocks) return;
    setBlocks((prev) => {
      const next = [...prev];
      for (const r of bulkDeletedBlocks) next.splice(r.index, 0, r.block);
      return next;
    });
    setBulkDeletedBlocks(null);
  };

  const handleBulkDuplicate = () => {
    if (selectedClientIds.size === 0) return;
    setBlocks((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (selectedClientIds.has(next[i].client_id)) {
          const original = next[i];
          const dup: EditorBlock = {
            ...original,
            client_id: crypto.randomUUID(),
            config: JSON.parse(JSON.stringify(original.config)),
          };
          next.splice(i + 1, 0, dup);
        }
      }
      return next;
    });
  };

  const handleBulkMoveUp = () => {
    if (selectedClientIds.size === 0) return;
    setBlocks((prev) => {
      const next = [...prev];
      for (let i = 1; i < next.length; i++) {
        if (
          selectedClientIds.has(next[i].client_id) &&
          !selectedClientIds.has(next[i - 1].client_id)
        ) {
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
        }
      }
      return next;
    });
  };

  const handleBulkMoveDown = () => {
    if (selectedClientIds.size === 0) return;
    setBlocks((prev) => {
      const next = [...prev];
      for (let i = next.length - 2; i >= 0; i--) {
        if (
          selectedClientIds.has(next[i].client_id) &&
          !selectedClientIds.has(next[i + 1].client_id)
        ) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
      return next;
    });
  };

  const handleBulkApplyBackground = (hex: string | null) => {
    if (selectedClientIds.size === 0) return;
    setBlocks((prev) =>
      prev.map((b) =>
        selectedClientIds.has(b.client_id)
          ? { ...b, config: { ...b.config, background_color: hex } }
          : b,
      ),
    );
  };

  const handleBulkApplyPadding = (padding: BlockPadding) => {
    if (selectedClientIds.size === 0) return;
    setBlocks((prev) =>
      prev.map((b) =>
        selectedClientIds.has(b.client_id)
          ? { ...b, config: { ...b.config, padding } }
          : b,
      ),
    );
  };

  const canBulkMoveUp = useMemo(() => {
    for (let i = 0; i < blocks.length; i++) {
      if (selectedClientIds.has(blocks[i].client_id)) return i > 0;
    }
    return false;
  }, [blocks, selectedClientIds]);

  const canBulkMoveDown = useMemo(() => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      if (selectedClientIds.has(blocks[i].client_id)) return i < blocks.length - 1;
    }
    return false;
  }, [blocks, selectedClientIds]);

  useEffect(() => {
    if (mode !== "manage") return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedClientIds(new Set(blocks.map((b) => b.client_id)));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedClientIds(new Set());
        setLastClickedClientId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, blocks]);

  const handleInsert = (atIndex: number, blockType: BlockType) => {
    const newBlock: EditorBlock = {
      client_id: crypto.randomUUID(),
      block_type: blockType,
      config: BLOCK_TYPE_META[blockType].defaultConfig(),
    };
    setBlocks((prev) => [...prev.slice(0, atIndex), newBlock, ...prev.slice(atIndex)]);
    setSelectedClientId(newBlock.client_id);
    setPaneOpen(true);
  };

  const handleReorder = (from: number, to: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleMoveUp = (clientId: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.client_id === clientId);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const handleMoveDown = (clientId: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.client_id === clientId);
      if (i < 0 || i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i + 1], next[i]] = [next[i], next[i + 1]];
      return next;
    });
  };

  const handleDuplicate = (clientId: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.client_id === clientId);
      if (i < 0) return prev;
      const original = prev[i];
      const duplicate: EditorBlock = {
        ...original,
        client_id: crypto.randomUUID(),
        config: JSON.parse(JSON.stringify(original.config)),
      };
      return [...prev.slice(0, i + 1), duplicate, ...prev.slice(i + 1)];
    });
  };

  const handleDelete = (clientId: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.client_id === clientId);
      if (i < 0) return prev;
      setDeletedBlock({ block: prev[i], index: i });
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
        setPaneOpen(false);
      }
      return prev.filter((b) => b.client_id !== clientId);
    });
  };

  const handleUndoDelete = () => {
    if (!deletedBlock) return;
    setBlocks((prev) => [
      ...prev.slice(0, deletedBlock.index),
      deletedBlock.block,
      ...prev.slice(deletedBlock.index),
    ]);
    setDeletedBlock(null);
  };

  const updateBlock = (next: EditorBlock) => {
    // If an asset_id was newly set, register it for signed-url fetching.
    const cfg: any = next.config ?? {};
    if (cfg.asset_id && typeof cfg.asset_id === "string") {
      registerNewAssetId(cfg.asset_id);
    }
    setBlocks((prev) => prev.map((b) => (b.client_id === next.client_id ? next : b)));
  };

  const selectedBlock = blocks.find((b) => b.client_id === selectedClientId) ?? null;

  const pickUpDraft = () => {
    if (!draftRow) return;
    const draftBlocks = (draftRow.draft_json?.blocks ?? []) as EditorBlock[];
    setBlocks(draftBlocks);
    setShowDraftBanner(false);
  };

  const startOver = async () => {
    if (!contentItemId) return;
    try {
      await supabase.rpc("discard_lesson_block_draft" as any, {
        p_content_item_id: contentItemId,
      });
    } catch {
      // non-fatal
    }
    setShowDraftBanner(false);
    setDraftRow(null);
  };

  const statusLabel = useMemo(() => {
    if (saving) return "Saving…";
    if (isDirty) {
      if (draftStatus.status === "saving") return "Saving draft…";
      if (draftStatus.status === "saved") return "Saved (draft)";
      return "Unsaved changes";
    }
    return "Saved";
  }, [saving, isDirty, draftStatus.status]);

  if (!loaded || itemQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const item: any = itemQuery.data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-3 border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-auto px-2 py-1 text-muted-foreground hover:text-foreground"
          onClick={() => guardedNavigate("/super-admin/content-authoring")}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to content authoring
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: "#021F36" }}>
              {item?.title ?? "Lesson"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Build and arrange the blocks that make up this lesson.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isDirty ? "secondary" : "outline"}>{statusLabel}</Badge>
            <Button
              disabled={!isDirty || saving}
              onClick={() => setSaveDialogOpen(true)}
              className="shadow-cta"
            >
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Draft banner */}
      {showDraftBanner && draftRow && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="text-sm">
              You have an unsaved draft from{" "}
              <strong>
                {formatDistanceToNow(new Date(draftRow.updated_at ?? draftRow.created_at), {
                  addSuffix: true,
                })}
              </strong>
              .
              <div className="text-xs text-muted-foreground">
                Pick up where you left off, or start over with the saved version.
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={pickUpDraft}>
                Pick up where I left off
              </Button>
              <Button size="sm" variant="outline" onClick={startOver}>
                Start over with the saved version
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Body — stack gets left-margin to leave room for the fixed-positioned pane */}
      <div className="relative">
        <EditorSlidePane
          open={paneOpen && !!selectedBlock}
          block={selectedBlock}
          contentItemId={contentItemId!}
          onChange={updateBlock}
          onClose={() => {
            setPaneOpen(false);
            setSelectedClientId(null);
          }}
          isDirty={isDirty}
          saving={saving}
          onRequestSave={() => setSaveDialogOpen(true)}
        />

        <div
          className={cn(
            "flex-1 transition-all duration-300 ease-out",
            paneOpen && !!selectedBlock ? "md:ml-[480px]" : "",
          )}
        >
          {blocks.length === 0 ? (
            <div className="flex h-[50vh] items-center justify-center">
              <Card className="w-96">
                <CardContent className="flex flex-col items-center gap-3 p-8">
                  <div className="text-sm text-muted-foreground">No blocks yet</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button>
                        <Plus className="mr-1 h-4 w-4" />
                        Add your first block
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="center">
                      <AddBlockPopover onSelect={(bt) => handleInsert(0, bt)} />
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <StackedLessonEditor
                blocks={blocks}
                selectedClientId={selectedClientId}
                assetUrlMap={assetUrlMap}
                onSelectBlock={handleSelectBlock}
                onReorder={handleReorder}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onInsert={handleInsert}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </div>
          )}
        </div>
      </div>

      <UndoDeleteToast
        open={!!deletedBlock}
        onUndo={handleUndoDelete}
        onDismiss={() => setDeletedBlock(null)}
      />

      {/* Save dialog */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save lesson blocks</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for this change. Recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="save-reason">Reason *</Label>
            <Textarea
              id="save-reason"
              rows={3}
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              placeholder="Explain why you're saving these changes."
              disabled={saving}
            />
            <p
              className={cn(
                "text-xs",
                saveReason.trim().length >= 10
                  ? "text-muted-foreground"
                  : "text-destructive",
              )}
            >
              {saveReason.trim().length}/10 characters minimum.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} onClick={() => setSaveAndNavigateTo(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saveReason.trim().length < 10 || saving}
              onClick={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave guard */}
      <AlertDialog
        open={showLeaveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowLeaveDialog(false);
            setPendingNavigation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Leave anyway?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowLeaveDialog(false);
                setPendingNavigation(null);
              }}
            >
              Stay
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (contentItemId) {
                  try {
                    await supabase.rpc("discard_lesson_block_draft" as any, {
                      p_content_item_id: contentItemId,
                    });
                  } catch {
                    // non-fatal
                  }
                }
                const target = pendingNavigation;
                setShowLeaveDialog(false);
                setPendingNavigation(null);
                if (target && target !== "__browser_back__") {
                  navigate(target);
                } else if (target === "__browser_back__") {
                  window.history.back();
                }
              }}
            >
              Discard and leave
            </Button>
            <AlertDialogAction
              className="shadow-cta"
              onClick={(e) => {
                e.preventDefault();
                setShowLeaveDialog(false);
                setSaveAndNavigateTo(pendingNavigation);
                setPendingNavigation(null);
                setSaveDialogOpen(true);
              }}
            >
              Save and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
