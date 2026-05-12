import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BLOCK_TYPE_META, type BlockType } from "../blockTypeMeta";
import type {
  AiMode,
  ChatMessage,
  FullContentItem,
  LengthLevel,
  OutlineItem,
} from "./types";
import { mapAiError } from "./mapAiError";
import { COST_ESTIMATES } from "./costEstimates";

export type IterationTarget =
  | { kind: "outline_item"; item: OutlineItem }
  | { kind: "outline_add"; afterId: string | null }
  | { kind: "full_block"; block: FullContentItem };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: IterationTarget | null;
  contentItemId: string;
  voicePresetKey: string | null;
  customVoiceGuidance: string | null;
  customVoiceExample: string | null;
  voiceDisplayName: string;
  attachedDocumentIds: string[];
  mode: AiMode;
  conversationMessages: ChatMessage[]; // for context on outline iterate/add calls
  lengthPreference: LengthLevel;
  onLengthChange: (next: LengthLevel) => void;
  onApplyOutlineItem: (
    target: Extract<IterationTarget, { kind: "outline_item" } | { kind: "outline_add" }>,
    item: OutlineItem,
  ) => void;
  onApplyFullBlock: (
    target: Extract<IterationTarget, { kind: "full_block" }>,
    block: FullContentItem,
  ) => void;
}

export function IterationModal(props: Props) {
  const {
    open,
    onOpenChange,
    target,
    voicePresetKey,
    customVoiceGuidance,
    customVoiceExample,
    voiceDisplayName,
    attachedDocumentIds,
    mode,
    conversationMessages,
    contentItemId,
    lengthPreference,
    onLengthChange,
    onApplyOutlineItem,
    onApplyFullBlock,
  } = props;

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!target) return null;

  const title =
    target.kind === "outline_add"
      ? "Add a new outline item"
      : target.kind === "outline_item"
      ? `Iterate this ${labelFor(target.item.block_type)}`
      : `Iterate this ${labelFor(target.block.block_type)}`;

  const placeholder =
    target.kind === "outline_add"
      ? "What should this new outline item cover?"
      : target.kind === "outline_item"
      ? "What should change about this item?"
      : "What should change about this block?";

  const costStr =
    target.kind === "full_block"
      ? COST_ESTIMATES.iterateFullBlock
      : COST_ESTIMATES.iterateOutlineItem;

  const reset = () => {
    setText("");
    setBusy(false);
    setErrorMsg(null);
  };

  const handleClose = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      if (target.kind === "full_block") {
        const author_prompt = `${JSON.stringify(target.block.config)} --- Change request: ${text.trim()}`;
        const { data, error } = await supabase.functions.invoke(
          "draft-lesson-block",
          {
            body: {
              block_type: target.block.block_type,
              author_prompt,
              voice_preset_key: voicePresetKey ?? undefined,
              custom_voice_guidance: customVoiceGuidance ?? undefined,
              custom_voice_example: customVoiceExample ?? undefined,
            },
          },
        );
        if (error) throw error;
        const cfg = (data as any)?.config as Record<string, unknown> | undefined;
        if (!cfg) throw { error: "ai_output_unparseable" };
        onApplyFullBlock(target, {
          id: target.block.id,
          block_type: target.block.block_type,
          config: cfg,
        });
        reset();
        onOpenChange(false);
      } else {
        // outline_item or outline_add
        const targetSummary =
          target.kind === "outline_item"
            ? `Iterate this outline item (${target.item.block_type}). Current summary: "${target.item.summary_one_line}". Current objective: "${target.item.learning_objective_fragment}". Change: ${text.trim()}`
            : `Add a new outline item. ${text.trim()}`;

        const messages: ChatMessage[] = [
          ...conversationMessages,
          { role: "user", content: targetSummary },
        ];

        const { data, error } = await supabase.functions.invoke(
          "scaffold-lesson-outline",
          {
            body: {
              content_item_id: contentItemId,
              messages,
              attached_document_ids: attachedDocumentIds,
              voice_preset_key: voicePresetKey ?? undefined,
              custom_voice_guidance: customVoiceGuidance ?? undefined,
              custom_voice_example: customVoiceExample ?? undefined,
              mode,
              max_outline_items: 1,
            },
          },
        );
        if (error) throw error;
        const outline = (data as any)?.outline as
          | Array<{
              block_type: string;
              summary_one_line: string;
              learning_objective_fragment: string;
            }>
          | undefined;
        const first = outline?.[0];
        if (!first) throw { error: "ai_output_unparseable" };
        const newItem: OutlineItem = {
          id: target.kind === "outline_item" ? target.item.id : crypto.randomUUID(),
          block_type: first.block_type,
          summary_one_line: first.summary_one_line,
          learning_objective_fragment: first.learning_objective_fragment,
        };
        onApplyOutlineItem(target, newItem);
        reset();
        onOpenChange(false);
      }
    } catch (e) {
      const info = mapAiError(e);
      setErrorMsg(info.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Using voice: <strong>{voiceDisplayName}</strong> · {costStr}
          </DialogDescription>
        </DialogHeader>
        {target.kind === "outline_item" && (
          <details className="rounded-md border bg-muted/40 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Current item</summary>
            <p className="mt-2"><strong>Type:</strong> {labelFor(target.item.block_type)}</p>
            <p className="mt-1"><strong>Summary:</strong> {target.item.summary_one_line}</p>
            <p className="mt-1"><strong>Objective:</strong> {target.item.learning_objective_fragment}</p>
          </details>
        )}
        {target.kind === "full_block" && (
          <details className="rounded-md border bg-muted/40 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Current block (JSON)</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px]">
              {JSON.stringify(target.block.config, null, 2)}
            </pre>
          </details>
        )}
        <div className="space-y-2">
          <Label htmlFor="iterate-text">What should change?</Label>
          <Textarea
            id="iterate-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={busy}
          />
        </div>
        {errorMsg && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {errorMsg}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!text.trim() || busy}
            style={{ backgroundColor: "#F5741A", color: "white" }}
          >
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelFor(bt: string): string {
  const meta = BLOCK_TYPE_META[bt as BlockType];
  return meta?.label ?? bt;
}
