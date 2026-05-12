import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, Loader2, Plus, Save } from "lucide-react";
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
import { BlockListPane } from "@/components/super-admin/lesson-blocks/BlockListPane";
import { BlockEditorPane } from "@/components/super-admin/lesson-blocks/BlockEditorPane";
import { AddBlockPopover } from "@/components/super-admin/lesson-blocks/AddBlockPopover";
import {
  BLOCK_TYPE_META,
  type BlockType,
  type EditorBlock,
} from "@/components/super-admin/lesson-blocks/blockTypeMeta";
import { useLessonBlockDraft } from "@/components/super-admin/lesson-blocks/useLessonBlockDraft";
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
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch parent content item
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

  // Validate item; redirect if not editable
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

  // Fetch canonical lesson_blocks + draft once
  const [canonicalLoaded, setCanonicalLoaded] = useState<EditorBlock[] | null>(null);
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
          .eq("user_id", user.id)
          .maybeSingle();
        draft = d ?? null;
      }
      if (cancelled) return;

      setCanonicalLoaded(canonical);
      setDraftRow(draft);
      if (draft) {
        setShowDraftBanner(true);
        // Preload canonical so the user sees it; banner gates picking up the draft
        setBlocks(canonical);
        setInitialBlocks(canonical);
      } else {
        setBlocks(canonical);
        setInitialBlocks(canonical);
      }
      setLoaded(true);
      // Defer enabling auto-save until user has interacted.
      setTimeout(() => setDraftEnabled(true), 100);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentItemId, itemQuery.data, toast]);

  const isDirty = useMemo(
    () => JSON.stringify(blocks) !== JSON.stringify(initialBlocks),
    [blocks, initialBlocks],
  );

  // beforeunload guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Navigation blocker — manual guard for back-button navigation since
  // react-router v6 useBlocker requires a data router (we use BrowserRouter).
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Intercept browser back/forward when isDirty
  useEffect(() => {
    if (!isDirty) return;
    const handlePopState = (e: PopStateEvent) => {
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

  // Auto-save draft
  const draftStatus = useLessonBlockDraft({
    contentItemId: contentItemId ?? "",
    blocks,
    enabled: !!contentItemId && draftEnabled,
  });

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveReason, setSaveReason] = useState("");
  const [saving, setSaving] = useState(false);

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
    setBlocks(next);
    setInitialBlocks(next);
    setSelectedClientId(null);
  }, [contentItemId]);

  const handleSave = async () => {
    if (!contentItemId) return;
    if (saveReason.trim().length < 10) return;
    setSaving(true);
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
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Block list mutators
  const insertBlock = (atIndex: number, blockType: BlockType) => {
    const newBlock: EditorBlock = {
      client_id: crypto.randomUUID(),
      block_type: blockType,
      config: BLOCK_TYPE_META[blockType].defaultConfig(),
    };
    const next = [...blocks];
    next.splice(atIndex, 0, newBlock);
    setBlocks(next);
    setSelectedClientId(newBlock.client_id);
  };

  const reorderBlock = (from: number, to: number) => {
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
  };

  const deleteBlock = (clientId: string) => {
    setBlocks((prev) => prev.filter((b) => b.client_id !== clientId));
    if (selectedClientId === clientId) setSelectedClientId(null);
  };

  const updateBlock = (next: EditorBlock) => {
    setBlocks((prev) => prev.map((b) => (b.client_id === next.client_id ? next : b)));
  };

  const selectedBlock = blocks.find((b) => b.client_id === selectedClientId) ?? null;

  // Draft banner actions
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
    } catch (e) {
      // non-fatal
    }
    setShowDraftBanner(false);
    setDraftRow(null);
  };

  // Status badge
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
          onClick={() => {
            guardedNavigate("/super-admin/content-authoring");
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to content authoring
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#021F36" }}>
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

      {/* Body */}
      {blocks.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center">
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
                  <AddBlockPopover onSelect={(bt) => insertBlock(0, bt)} />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div
          className={cn(
            "grid h-[calc(100vh-7rem)] grid-cols-1 gap-3 self-start md:grid-cols-12",
          )}
        >
          <Card className="flex h-full min-h-0 flex-col md:col-span-5 lg:col-span-4">
            <CardContent className="flex-1 overflow-y-auto p-3">
              <BlockListPane
                blocks={blocks}
                selectedClientId={selectedClientId}
                onSelect={setSelectedClientId}
                onReorder={reorderBlock}
                onDelete={deleteBlock}
                onInsert={insertBlock}
              />
            </CardContent>
          </Card>
          <Card className="flex h-full min-h-0 flex-col md:col-span-7 lg:col-span-8">
            <CardContent className="flex-1 overflow-y-auto p-0">
              <BlockEditorPane
                block={selectedBlock}
                onChange={updateBlock}
                contentItemId={contentItemId!}
              />
            </CardContent>
          </Card>
        </div>
      )}

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
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
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
            <AlertDialogAction
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
