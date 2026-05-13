import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import type { EditorBlock } from "./blockTypeMeta";
import { TextBlockForm } from "./block-forms/TextBlockForm";
import { HeadingBlockForm } from "./block-forms/HeadingBlockForm";
import { DividerBlockForm } from "./block-forms/DividerBlockForm";
import { ImageBlockForm } from "./block-forms/ImageBlockForm";
import { VideoEmbedBlockForm } from "./block-forms/VideoEmbedBlockForm";
import { QuoteBlockForm } from "./block-forms/QuoteBlockForm";
import { ListBlockForm } from "./block-forms/ListBlockForm";
import { CalloutBlockForm } from "./block-forms/CalloutBlockForm";
import { EmbedAudioBlockForm } from "./block-forms/EmbedAudioBlockForm";
import { StatCalloutBlockForm } from "./block-forms/StatCalloutBlockForm";
import { StatementABBlockForm } from "./block-forms/StatementABBlockForm";
import { AccordionBlockForm } from "./block-forms/AccordionBlockForm";
import { TabsBlockForm } from "./block-forms/TabsBlockForm";
import { ButtonStackBlockForm } from "./block-forms/ButtonStackBlockForm";
import { FlashcardsBlockForm } from "./block-forms/FlashcardsBlockForm";
import { CardSortBlockForm } from "./block-forms/CardSortBlockForm";
import { ScenarioBlockForm } from "./block-forms/ScenarioBlockForm";
import { KnowledgeCheckBlockForm } from "./block-forms/KnowledgeCheckBlockForm";
import { BlockStyleSection } from "./BlockStyleSection";
import { mapAiError } from "./ai-pane/mapAiError";
import { COST_ESTIMATES } from "./ai-pane/costEstimates";
import type { LengthLevel, VoicePreset } from "./ai-pane/types";
import { useEffect } from "react";

interface Props {
  block: EditorBlock | null;
  onChange: (next: EditorBlock) => void;
  contentItemId: string;
  siblingBlocks: EditorBlock[];
}

export function BlockEditorPane({ block, onChange, contentItemId, siblingBlocks }: Props) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refineBusy, setRefineBusy] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>([]);
  const [voicePresetKey, setVoicePresetKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(`ai-authoring:voice:${contentItemId}`);
  });
  const [lengthPreference, setLengthPreference] = useState<LengthLevel>(() => {
    if (typeof window === "undefined") return "standard";
    const stored = window.localStorage.getItem(`ai-authoring:length:${contentItemId}`);
    if (stored === "concise" || stored === "standard" || stored === "detailed") return stored;
    return "standard";
  });

  const handleLengthChange = (next: LengthLevel) => {
    setLengthPreference(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`ai-authoring:length:${contentItemId}`, next);
    }
  };

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
      if (!voicePresetKey && presets[0]) setVoicePresetKey(presets[0].preset_key);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg: any = block?.config;

  const handleConfig = useMemo(
    () => (nextConfig: Record<string, unknown>) => {
      if (!block) return;
      onChange({ ...block, config: nextConfig });
    },
    [block, onChange],
  );

  const handleRefine = async () => {
    if (!block || !refineText.trim() || refineBusy) return;
    setRefineBusy(true);
    setRefineError(null);
    try {
      const { data, error } = await supabase.functions.invoke("draft-lesson-block", {
        body: {
          block_type: block.block_type,
          author_prompt: refineText.trim(),
          lesson_context: JSON.stringify(block.config),
          voice_preset_key: voicePresetKey ?? undefined,
          length: lengthPreference,
        },
      });
      if (error) throw error;
      const newCfg = (data as any)?.config as Record<string, unknown> | undefined;
      if (!newCfg) throw { error: "ai_output_unparseable" };
      onChange({ ...block, config: newCfg });
      setRefineOpen(false);
      setRefineText("");
    } catch (e) {
      setRefineError(mapAiError(e).message);
    } finally {
      setRefineBusy(false);
    }
  };

  if (!block) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Select a block from the stack to edit.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Refine with AI */}
      <div className="rounded-md border bg-muted/30 p-3">
        {!refineOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setRefineOpen(true)}
          >
            <Sparkles className="mr-1 h-4 w-4" style={{ color: "#F5741A" }} />
            Refine with AI
            <span className="ml-2 text-xs text-muted-foreground">{COST_ESTIMATES.refineWithAi}</span>
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Refine this block</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setRefineOpen(false);
                  setRefineText("");
                  setRefineError(null);
                }}
                disabled={refineBusy}
              >
                Cancel
              </Button>
            </div>
            <Textarea
              rows={3}
              placeholder="What should change?"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              disabled={refineBusy}
            />
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Voice</Label>
              <Select
                value={voicePresetKey ?? ""}
                onValueChange={(v) => setVoicePresetKey(v || null)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Voice" />
                </SelectTrigger>
                <SelectContent>
                  {voicePresets.map((p) => (
                    <SelectItem key={p.preset_key} value={p.preset_key}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Length</Label>
              <Select
                value={lengthPreference}
                onValueChange={(v) => handleLengthChange(v as LengthLevel)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refineError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                {refineError}
                <Button size="sm" variant="ghost" className="ml-2 h-6" onClick={() => void handleRefine()}>
                  Retry
                </Button>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void handleRefine()}
              disabled={!refineText.trim() || refineBusy}
              style={{ backgroundColor: "#F5741A", color: "white" }}
            >
              {refineBusy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        )}
      </div>

      {block.block_type === "text" && <TextBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "heading" && <HeadingBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "divider" && <DividerBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "image" && (
        <ImageBlockForm value={cfg} onConfigChange={handleConfig} contentItemId={contentItemId} />
      )}
      {block.block_type === "video_embed" && (
        <VideoEmbedBlockForm value={cfg} onConfigChange={handleConfig} contentItemId={contentItemId} />
      )}
      {block.block_type === "quote" && <QuoteBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "list" && <ListBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "callout" && <CalloutBlockForm value={cfg} onConfigChange={handleConfig} />}
      {block.block_type === "embed_audio" && (
        <EmbedAudioBlockForm value={cfg} onConfigChange={handleConfig} contentItemId={contentItemId} />
      )}
      {block.block_type === "stat_callout" && (
        <StatCalloutBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "statement_a_b" && (
        <StatementABBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "accordion" && (
        <AccordionBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "tabs" && (
        <TabsBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "button_stack" && (
        <ButtonStackBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          siblingBlocks={siblingBlocks.filter((b) => b.client_id !== block.client_id)}
        />
      )}
      {block.block_type === "flashcards" && (
        <FlashcardsBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
      {block.block_type === "card_sort" && (
        <CardSortBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
      {block.block_type === "scenario" && (
        <ScenarioBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
      {block.block_type === "knowledge_check" && (
        <KnowledgeCheckBlockForm value={cfg} onConfigChange={handleConfig} />
      )}

      <BlockStyleSection value={cfg} onConfigChange={handleConfig} />
    </div>
  );
}
