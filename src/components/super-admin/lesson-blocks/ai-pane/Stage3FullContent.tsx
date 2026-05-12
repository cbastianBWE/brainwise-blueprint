import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockRenderer } from "../BlockRenderer";
import { BLOCK_TYPE_META, type BlockType, type EditorBlock } from "../blockTypeMeta";
import type { AiMode, ChatMessage, FullContentItem, LengthLevel } from "./types";
import { IterationModal, type IterationTarget } from "./IterationModal";

interface Props {
  contentItemId: string;
  blocks: FullContentItem[];
  onBlocksChange: (b: FullContentItem[]) => void;
  onBack: () => void;
  onBuild: () => void;
  onDiscard: () => void;
  building: boolean;
  voicePresetKey: string | null;
  customVoiceGuidance: string;
  customVoiceExample: string;
  voiceDisplayName: string;
  attachedDocumentIds: string[];
  mode: AiMode;
  conversationMessages: ChatMessage[];
  assetUrlMap: Map<string, string>;
  lengthPreference: LengthLevel;
  onLengthChange: (next: LengthLevel) => void;
}

export function Stage3FullContent(props: Props) {
  const {
    blocks,
    onBlocksChange,
    onBack,
    onBuild,
    onDiscard,
    building,
    voicePresetKey,
    customVoiceGuidance,
    customVoiceExample,
    voiceDisplayName,
    attachedDocumentIds,
    mode,
    conversationMessages,
    contentItemId,
    assetUrlMap,
    lengthPreference,
    onLengthChange,
  } = props;

  const [iterationOpen, setIterationOpen] = useState(false);
  const [iterationTarget, setIterationTarget] = useState<IterationTarget | null>(null);

  const openIterate = (block: FullContentItem) => {
    setIterationTarget({ kind: "full_block", block });
    setIterationOpen(true);
  };

  const handleApplyFullBlock = (
    target: Extract<IterationTarget, { kind: "full_block" }>,
    next: FullContentItem,
  ) => {
    onBlocksChange(blocks.map((b) => (b.id === next.id ? next : b)));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3 text-sm text-muted-foreground">
        Review each block. Click any block to iterate it. When done, build the lesson.
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks generated.</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((b) => {
              const meta = BLOCK_TYPE_META[b.block_type as BlockType];
              const Icon = meta?.icon;
              const editorBlock: EditorBlock = {
                client_id: b.id,
                block_type: b.block_type as BlockType,
                config: b.config,
              };
              return (
                <div key={b.id} className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: "#021F36" }}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: "#F5741A" }} />}
                      {meta?.label ?? b.block_type}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => openIterate(b)}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Iterate this block
                    </Button>
                  </div>
                  <div className="rounded border bg-muted/30 p-2">
                    <BlockRenderer block={editorBlock} assetUrlMap={assetUrlMap} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onBack} disabled={building}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to outline
          </Button>
          <Button
            className="flex-1 shadow-cta"
            onClick={onBuild}
            disabled={building || blocks.length === 0}
            style={{ backgroundColor: "#F5741A", color: "white" }}
          >
            {building ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Build lesson
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onDiscard}
          disabled={building}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Discard and start over
        </Button>
      </div>

      <IterationModal
        open={iterationOpen}
        onOpenChange={setIterationOpen}
        target={iterationTarget}
        contentItemId={contentItemId}
        voicePresetKey={voicePresetKey}
        customVoiceGuidance={customVoiceGuidance || null}
        customVoiceExample={customVoiceExample || null}
        voiceDisplayName={voiceDisplayName}
        attachedDocumentIds={attachedDocumentIds}
        mode={mode}
        conversationMessages={conversationMessages}
        lengthPreference={lengthPreference}
        onLengthChange={onLengthChange}
        onApplyOutlineItem={() => {
          /* not used in stage 3 */
        }}
        onApplyFullBlock={handleApplyFullBlock}
      />
    </div>
  );
}
