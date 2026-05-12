import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useImpersonation } from "@/contexts/ImpersonationProvider";
import { cn } from "@/lib/utils";
import {
  type EditorBlock,
  BLOCK_TYPE_META,
  type BlockType,
  extractTextFromTipTap,
} from "../blockTypeMeta";
import { Stage1Chat } from "./Stage1Chat";
import { Stage2Outline } from "./Stage2Outline";
import { Stage3FullContent } from "./Stage3FullContent";
import { Stage4Built } from "./Stage4Built";
import {
  type AiMode,
  type AiStage,
  type ChatMessage,
  type FullContentItem,
  type FullContentState,
  type LengthLevel,
  type OutlineItem,
  type OutlineState,
  type SessionDocument,
  type VoicePreset,
} from "./types";
import {
  useAiAuthoringPersistence,
  type PersistenceState,
} from "./useAiAuthoringPersistence";
import { mapAiError } from "./mapAiError";

interface Props {
  open: boolean;
  onClose: () => void;
  contentItemId: string;
  canvasBlocks: EditorBlock[];
  assetUrlMap: Map<string, string>;
  onBuildLesson: (blocks: FullContentItem[], mode: AiMode) => void;
}

export function AiPane(props: Props) {
  const { open, onClose, contentItemId, canvasBlocks, assetUrlMap, onBuildLesson } = props;
  const { toast } = useToast();
  const { isImpersonating } = useImpersonation();

  // ---- State
  const [stage, setStage] = useState<AiStage>("chat");
  const [mode, setMode] = useState<AiMode>(canvasBlocks.length === 0 ? "fresh" : "fresh");
  const [modeLocked, setModeLocked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [outlineState, setOutlineState] = useState<OutlineState | null>(null);
  const [fullContentState, setFullContentState] = useState<FullContentState | null>(null);
  const [attachedDocuments, setAttachedDocuments] = useState<SessionDocument[]>([]);
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>([]);
  const [voicePresetKey, setVoicePresetKey] = useState<string | null>(null);
  const [customVoiceGuidance, setCustomVoiceGuidance] = useState("");
  const [customVoiceExample, setCustomVoiceExample] = useState("");
  const [lengthPreference, setLengthPreference] = useState<LengthLevel>("standard");
  const [hasRehydrated, setHasRehydrated] = useState(false);
  const [staleBannerOpen, setStaleBannerOpen] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [loadingExpand, setLoadingExpand] = useState(false);

  // One-shot drift flag; if true, prepend canvas summary to next outgoing AI call.
  const driftNoteRef = useRef<string | null>(null);

  // Lock mode silently if canvas empty.
  useEffect(() => {
    if (canvasBlocks.length === 0 && !modeLocked) {
      setMode("fresh");
    }
  }, [canvasBlocks.length, modeLocked]);

  // ---- Voice presets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_authoring_voice_presets")
        .select("preset_key,display_name,display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const presets = (data ?? []) as VoicePreset[];
      setVoicePresets(presets);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Rehydration on mount / contentItemId change
  useEffect(() => {
    let cancelled = false;
    setHasRehydrated(false);
    (async () => {
      try {
        const [{ data: convoRows }, { data: docRows }, { data: latestBlock }] = await Promise.all([
          supabase.rpc("get_ai_authoring_conversation", { p_content_item_id: contentItemId }),
          supabase.rpc("list_ai_authoring_session_documents", {
            p_content_item_id: contentItemId,
          }),
          supabase
            .from("lesson_blocks")
            .select("updated_at")
            .eq("content_item_id", contentItemId)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const conv = (convoRows as any[])?.[0];
        if (conv) {
          const convoStage = (conv.out_stage as AiStage) ?? "chat";
          setStage(convoStage);
          const convoMode = (conv.out_mode as AiMode) ?? "fresh";
          setMode(convoMode);
          const msgs = Array.isArray(conv.out_messages) ? (conv.out_messages as ChatMessage[]) : [];
          setMessages(msgs);
          if (msgs.some((m) => m.role === "user")) setModeLocked(true);
          setOutlineState((conv.out_outline_state as OutlineState | null) ?? null);
          setFullContentState((conv.out_full_content_state as FullContentState | null) ?? null);
          setVoicePresetKey(conv.out_voice_preset_key ?? null);
          setCustomVoiceGuidance(conv.out_custom_voice_guidance ?? "");
          setCustomVoiceExample(conv.out_custom_voice_example ?? "");
          setLengthPreference(((conv.out_length_preference as LengthLevel) ?? "standard"));

          const idleMs = Date.now() - new Date(conv.out_updated_at).getTime();
          const isIdle24h = idleMs > 24 * 60 * 60 * 1000;
          const lb: any = latestBlock;
          const canvasDrifted =
            lb?.updated_at && new Date(lb.updated_at) > new Date(conv.out_updated_at);
          if (isIdle24h && convoStage !== "built") setStaleBannerOpen(true);
          if (isIdle24h && canvasDrifted) {
            driftNoteRef.current = buildCanvasSummaryNote(canvasBlocks);
          }
        }

        const docs = (docRows as SessionDocument[]) ?? [];
        setAttachedDocuments(docs);

        // Default voice if none persisted: stickied per-lesson, then first preset.
        if (!conv?.out_voice_preset_key) {
          const sticky = window.localStorage.getItem(`ai-authoring:voice:${contentItemId}`);
          setVoicePresetKey(sticky ?? null);
        }
      } catch (e) {
        console.error("AI pane rehydration failed", e);
      } finally {
        if (!cancelled) setHasRehydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItemId]);

  // Persist voice preset stickily.
  useEffect(() => {
    if (!hasRehydrated) return;
    if (voicePresetKey) {
      window.localStorage.setItem(`ai-authoring:voice:${contentItemId}`, voicePresetKey);
    }
  }, [voicePresetKey, contentItemId, hasRehydrated]);

  // Lock mode after first user message lands.
  useEffect(() => {
    if (!modeLocked && messages.some((m) => m.role === "user")) setModeLocked(true);
  }, [messages, modeLocked]);

  // ---- Persistence
  const persistenceState: PersistenceState = useMemo(
    () => ({
      stage,
      mode,
      messages,
      outlineState,
      fullContentState,
      attachedDocumentIds: attachedDocuments.map((d) => d.out_id),
      voicePresetKey,
      customVoiceGuidance: customVoiceGuidance || null,
      customVoiceExample: customVoiceExample || null,
      lengthPreference,
    }),
    [
      stage,
      mode,
      messages,
      outlineState,
      fullContentState,
      attachedDocuments,
      voicePresetKey,
      customVoiceGuidance,
      customVoiceExample,
      lengthPreference,
    ],
  );
  const persistence = useAiAuthoringPersistence({
    contentItemId,
    state: persistenceState,
    enabled: hasRehydrated && open,
  });

  const refreshAttachedDocs = useCallback(async () => {
    const { data } = await supabase.rpc("list_ai_authoring_session_documents", {
      p_content_item_id: contentItemId,
    });
    setAttachedDocuments((data as SessionDocument[]) ?? []);
  }, [contentItemId]);

  // Helper: derive canvas-block summary string for drift / append/replace context.
  const canvasBlockSummary = useMemo(
    () => (canvasBlocks.length === 0 ? undefined : buildCanvasSummaryNote(canvasBlocks)),
    [canvasBlocks],
  );

  const voiceDisplayName = useMemo(() => {
    if (!voicePresetKey) return "Custom voice";
    return voicePresets.find((p) => p.preset_key === voicePresetKey)?.display_name ?? voicePresetKey;
  }, [voicePresetKey, voicePresets]);

  // ---- Stage transitions

  const handleAdvanceToOutline = async () => {
    setLoadingOutline(true);
    try {
      const driftNote = driftNoteRef.current;
      driftNoteRef.current = null;
      const messagesForCall = driftNote
        ? [
            ...messages,
            {
              role: "user" as const,
              content: `Note: ${driftNote}\n\n(Now please generate the outline.)`,
            },
          ]
        : messages;
      const { data, error } = await supabase.functions.invoke("scaffold-lesson-outline", {
        body: {
          content_item_id: contentItemId,
          messages: messagesForCall.map((m) => ({ role: m.role, content: m.content })),
          attached_document_ids: attachedDocuments.map((d) => d.out_id),
          voice_preset_key: voicePresetKey ?? undefined,
          custom_voice_guidance: customVoiceGuidance || undefined,
          custom_voice_example: customVoiceExample || undefined,
          mode,
          length: lengthPreference,
          canvas_block_summary: canvasBlockSummary,
        },
      });
      if (error) throw error;
      const items: OutlineItem[] = ((data as any)?.outline ?? []).map((it: any) => ({
        id: crypto.randomUUID(),
        block_type: it.block_type,
        summary_one_line: it.summary_one_line,
        learning_objective_fragment: it.learning_objective_fragment,
      }));
      setOutlineState({ items });
      setStage("outline");
    } catch (e) {
      const info = mapAiError(e);
      toast({ title: info.title, description: info.message, variant: "destructive" });
    } finally {
      setLoadingOutline(false);
    }
  };

  const handleApproveOutline = async () => {
    if (!outlineState) return;
    setLoadingExpand(true);
    try {
      const driftNote = driftNoteRef.current;
      driftNoteRef.current = null;
      const messagesForCall = driftNote
        ? [
            ...messages,
            {
              role: "user" as const,
              content: `Note: ${driftNote}`,
            },
          ]
        : messages;
      const { data, error } = await supabase.functions.invoke("expand-lesson-from-outline", {
        body: {
          content_item_id: contentItemId,
          messages: messagesForCall.map((m) => ({ role: m.role, content: m.content })),
          attached_document_ids: attachedDocuments.map((d) => d.out_id),
          voice_preset_key: voicePresetKey ?? undefined,
          custom_voice_guidance: customVoiceGuidance || undefined,
          custom_voice_example: customVoiceExample || undefined,
          mode,
          length: lengthPreference,
          outline: outlineState.items.map((i) => ({
            block_type: i.block_type,
            summary_one_line: i.summary_one_line,
            learning_objective_fragment: i.learning_objective_fragment,
          })),
          canvas_block_summary: canvasBlockSummary,
        },
      });
      if (error) throw error;
      const blocksOut = ((data as any)?.blocks ?? []) as Array<{
        block_type: string;
        config: Record<string, unknown>;
      }>;
      const items: FullContentItem[] = blocksOut.map((b, idx) => ({
        id: outlineState.items[idx]?.id ?? crypto.randomUUID(),
        block_type: b.block_type,
        config: b.config,
      }));
      setFullContentState({ blocks: items });
      setStage("full_content");
    } catch (e) {
      const info = mapAiError(e);
      toast({ title: info.title, description: info.message, variant: "destructive" });
    } finally {
      setLoadingExpand(false);
    }
  };

  const handleBuild = async () => {
    if (!fullContentState) return;
    persistence.pause();
    setStage("built");
    try {
      // Make sure the "built" stage transition is persisted before we commit.
      await persistence.flushNow({ stage: "built" });
    } catch {
      /* non-fatal */
    }
    onBuildLesson(fullContentState.blocks, mode);
    setTimeout(() => persistence.resume(), 500);
  };

  const handleStartOver = async () => {
    try {
      await supabase.rpc("delete_ai_authoring_conversation", {
        p_content_item_id: contentItemId,
      });
    } catch (e) {
      console.error("delete_ai_authoring_conversation failed", e);
    }
    setStage("chat");
    setMode(canvasBlocks.length === 0 ? "fresh" : "fresh");
    setModeLocked(false);
    setMessages([]);
    setOutlineState(null);
    setFullContentState(null);
    setAttachedDocuments([]);
    setStaleBannerOpen(false);
    setShowStartOverConfirm(false);
    driftNoteRef.current = null;
  };

  const handleUnlockMode = () => {
    setModeLocked(false);
    setMessages([]);
    setOutlineState(null);
    setFullContentState(null);
    setStage("chat");
  };

  // ---- Render
  return (
    <>
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 z-20 flex w-[min(480px,100vw)] flex-col border-l bg-background shadow-md transition-[right] duration-300 ease-out",
          !open && "pointer-events-none",
        )}
        style={{
          top: 56,
          right: open ? 0 : -480,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#F5741A" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#021F36" }}>
              AI authoring
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {stageLabel(stage)}
            </Badge>
            {persistence.status === "saving" && (
              <span className="text-[10px] text-muted-foreground">Saving…</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowStartOverConfirm(true)}
            >
              Start over
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isImpersonating && (
          <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900">
            AI authoring isn't available during impersonation. Exit impersonation to use this feature.
          </div>
        )}

        {staleBannerOpen && (
          <div className="border-b bg-muted/40 p-3 text-xs">
            This conversation has been idle for a while. Continue where you left off or start fresh?
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStaleBannerOpen(false)}>
                Continue
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setStaleBannerOpen(false);
                  setShowStartOverConfirm(true);
                }}
              >
                Start over
              </Button>
            </div>
          </div>
        )}

        {!hasRehydrated ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isImpersonating ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Disabled during impersonation.
          </div>
        ) : (
          <>
            {stage === "chat" && (
              <Stage1Chat
                contentItemId={contentItemId}
                voicePresets={voicePresets}
                voicePresetKey={voicePresetKey}
                onVoicePresetChange={setVoicePresetKey}
                customVoiceGuidance={customVoiceGuidance}
                onCustomVoiceGuidanceChange={setCustomVoiceGuidance}
                customVoiceExample={customVoiceExample}
                onCustomVoiceExampleChange={setCustomVoiceExample}
                messages={messages}
                onMessagesChange={setMessages}
                attachedDocuments={attachedDocuments}
                onAttachedDocumentsChange={setAttachedDocuments}
                canvasIsEmpty={canvasBlocks.length === 0}
                mode={mode}
                onModeChange={setMode}
                modeLocked={modeLocked}
                onUnlockMode={handleUnlockMode}
                canvasBlockSummary={canvasBlockSummary}
                onAdvanceToOutline={handleAdvanceToOutline}
                loadingOutline={loadingOutline}
                refreshAttachedDocs={refreshAttachedDocs}
                lengthPreference={lengthPreference}
                onLengthChange={setLengthPreference}
              />
            )}
            {stage === "outline" && (
              <Stage2Outline
                contentItemId={contentItemId}
                items={outlineState?.items ?? []}
                onItemsChange={(items) => setOutlineState({ items })}
                onBack={() => setStage("chat")}
                onApprove={handleApproveOutline}
                approving={loadingExpand}
                voicePresetKey={voicePresetKey}
                customVoiceGuidance={customVoiceGuidance}
                customVoiceExample={customVoiceExample}
                voiceDisplayName={voiceDisplayName}
                attachedDocumentIds={attachedDocuments.map((d) => d.out_id)}
                mode={mode}
                conversationMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
                lengthPreference={lengthPreference}
                onLengthChange={setLengthPreference}
              />
            )}
            {stage === "full_content" && (
              <Stage3FullContent
                contentItemId={contentItemId}
                blocks={fullContentState?.blocks ?? []}
                onBlocksChange={(blocks) => setFullContentState({ blocks })}
                onBack={() => setStage("outline")}
                onBuild={handleBuild}
                onDiscard={() => setShowStartOverConfirm(true)}
                building={false}
                voicePresetKey={voicePresetKey}
                customVoiceGuidance={customVoiceGuidance}
                customVoiceExample={customVoiceExample}
                voiceDisplayName={voiceDisplayName}
                attachedDocumentIds={attachedDocuments.map((d) => d.out_id)}
                mode={mode}
                conversationMessages={messages}
                assetUrlMap={assetUrlMap}
                lengthPreference={lengthPreference}
                onLengthChange={setLengthPreference}
              />
            )}
            {stage === "built" && (
              <Stage4Built messages={messages} onStartOver={() => setShowStartOverConfirm(true)} />
            )}
          </>
        )}
      </aside>

      <AlertDialog open={showStartOverConfirm} onOpenChange={setShowStartOverConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the conversation, outline, generated content, and detaches uploaded
              reference docs. Lesson canvas blocks are NOT affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStartOver()}>
              Yes, start over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function stageLabel(stage: AiStage): string {
  switch (stage) {
    case "chat":
      return "Step 1: Chat";
    case "outline":
      return "Step 2: Outline";
    case "full_content":
      return "Step 3: Content";
    case "built":
      return "Step 4: Built";
  }
}

function buildCanvasSummaryNote(blocks: EditorBlock[]): string {
  if (blocks.length === 0) return "Canvas is empty.";
  const lines = blocks.slice(0, 30).map((b, i) => {
    const meta = BLOCK_TYPE_META[b.block_type as BlockType];
    const cfg: any = b.config ?? {};
    const text =
      extractTextFromTipTap(cfg.body) ||
      (typeof cfg.text === "string" ? cfg.text : "") ||
      (typeof cfg.alt === "string" ? cfg.alt : "") ||
      "";
    const trimmed = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    return `${i + 1}. ${meta?.label ?? b.block_type}${trimmed ? ` — ${trimmed}` : ""}`;
  });
  return `the lesson canvas has been edited since this conversation last ran. Current state:\n${lines.join("\n")}`;
}
