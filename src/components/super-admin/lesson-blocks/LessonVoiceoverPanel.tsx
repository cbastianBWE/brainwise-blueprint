import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Square, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromTipTap, type EditorBlock, type TipTapDocJSON } from "./blockTypeMeta";

interface Voice {
  voice_id: string;
  name: string;
  category?: string | null;
  labels?: Record<string, string> | null;
  preview_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItemId: string;
  blocks: EditorBlock[];
  onApplyBlocks: (next: EditorBlock[]) => void;
  onRegisterAsset: (assetId: string) => void;
}

const VOICE_STORAGE_KEY = "bw:elevenlabs:voice";

function readableText(block: EditorBlock): string {
  const cfg = block.config as Record<string, unknown>;
  const tip = (v: unknown) => extractTextFromTipTap(v as TipTapDocJSON | null | undefined);
  switch (block.block_type) {
    case "heading":
      return typeof cfg.text === "string" ? cfg.text : "";
    case "text":
    case "callout":
    case "media_text":
      return tip(cfg.body);
    case "quote": {
      const body = tip(cfg.body);
      const attr = typeof cfg.attribution === "string" ? cfg.attribution : "";
      return [body, attr].filter(Boolean).join(" — ");
    }
    case "stat_callout": {
      const stat = typeof cfg.stat === "string" ? cfg.stat : "";
      const label = typeof cfg.label === "string" ? cfg.label : "";
      return [stat, label, tip(cfg.body)].filter(Boolean).join(". ");
    }
    case "statement_a_b": {
      const aL = typeof cfg.a_label === "string" ? cfg.a_label : "";
      const bL = typeof cfg.b_label === "string" ? cfg.b_label : "";
      return [aL, tip(cfg.a_body), bL, tip(cfg.b_body)].filter(Boolean).join(". ");
    }
    case "list": {
      const items = Array.isArray(cfg.items) ? (cfg.items as Array<{ body?: unknown }>) : [];
      return items.map((it) => tip(it?.body)).filter(Boolean).join(". ");
    }
    default:
      return tip(cfg.body) || (typeof cfg.text === "string" ? cfg.text : "") || "";
  }
}

interface Section {
  heading: EditorBlock | null;
  content: EditorBlock[];
  text: string;
}

function groupSections(blocks: EditorBlock[]): Section[] {
  // Exclude existing audio players, videos, and prior section players
  const filtered = blocks.filter((b) => {
    if (b.block_type === "embed_audio") {
      return (b.config as any)?.voiceover_kind !== "section";
    }
    if (b.block_type === "video_embed") return false;
    return true;
  });
  // For sectioning content (text), also drop embed_audio entirely (we don't narrate players)
  const sections: Section[] = [];
  let current: Section = { heading: null, content: [], text: "" };
  for (const b of filtered) {
    if (b.block_type === "heading") {
      if (current.heading || current.content.length > 0) sections.push(current);
      current = { heading: b, content: [], text: "" };
    } else if (b.block_type === "embed_audio") {
      // skip audio players for narration text
      continue;
    } else {
      current.content.push(b);
    }
  }
  sections.push(current);
  for (const s of sections) {
    const parts: string[] = [];
    if (s.heading) {
      const t = readableText(s.heading);
      if (t) parts.push(t);
    }
    for (const c of s.content) {
      const t = readableText(c);
      if (t) parts.push(t);
    }
    s.text = parts.join("\n").trim();
  }
  return sections.filter((s) => s.text.length > 0);
}

export function LessonVoiceoverPanel({
  open,
  onOpenChange,
  contentItemId,
  blocks,
  onApplyBlocks,
  onRegisterAsset,
}: Props) {
  const { toast } = useToast();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [narrating, setNarrating] = useState(false);
  const [narrateProgress, setNarrateProgress] = useState<string | null>(null);

  const [standaloneText, setStandaloneText] = useState("");
  const [standaloneBusy, setStandaloneBusy] = useState(false);

  const [scripting, setScripting] = useState(false);
  const [scriptProgress, setScriptProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(VOICE_STORAGE_KEY) : null;
    if (stored) setSelectedVoice(stored);
    if (voices !== null) return;
    setVoicesLoading(true);
    setVoicesError(null);
    supabase.functions
      .invoke("lesson-elevenlabs-voices", { body: {} })
      .then(({ data, error }) => {
        if (error) {
          setVoicesError(error.message || "Failed to load voices");
          setVoices([]);
          return;
        }
        const list: Voice[] = Array.isArray((data as any)?.voices) ? (data as any).voices : [];
        setVoices(list);
        if (!stored && list.length > 0) setSelectedVoice(list[0].voice_id);
      })
      .catch((e) => {
        setVoicesError(e?.message || "Failed to load voices");
        setVoices([]);
      })
      .finally(() => setVoicesLoading(false));
  }, [open, voices]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewingId(null);
  };

  const playPreview = (v: Voice) => {
    if (!v.preview_url) return;
    stopPreview();
    const a = new Audio(v.preview_url);
    audioRef.current = a;
    setPreviewingId(v.voice_id);
    a.onended = () => {
      if (audioRef.current === a) {
        audioRef.current = null;
        setPreviewingId(null);
      }
    };
    a.play().catch(() => {
      setPreviewingId(null);
    });
  };

  const pickVoice = (id: string) => {
    setSelectedVoice(id);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  const sections = useMemo(() => groupSections(blocks), [blocks]);

  const scriptedPending = useMemo(
    () =>
      blocks.filter(
        (b) =>
          b.block_type === "embed_audio" &&
          typeof (b.config as any)?.script === "string" &&
          ((b.config as any).script as string).trim().length > 0 &&
          !(b.config as any)?.asset_id,
      ),
    [blocks],
  );

  type GenResult = { ok: boolean; asset_id?: string; tooLong?: boolean; message?: string };
  const generateOne = async (text: string, voiceId: string): Promise<GenResult> => {
    const { data, error } = await supabase.functions.invoke("lesson-elevenlabs-generate", {
      body: { content_item_id: contentItemId, text, voice_id: voiceId },
    });
    if (error) {
      const ctx: any = (error as any).context;
      let body: any = null;
      try {
        if (ctx && typeof ctx.json === "function") body = await ctx.json();
      } catch {
        // ignore
      }
      const code = body?.error || body?.code;
      const tooLong = code === "text_too_long_max_5000" || ctx?.status === 413;
      return { ok: false, tooLong, message: body?.message || error.message || "Generation failed" };
    }
    const asset_id = (data as any)?.asset_id;
    if (!asset_id) return { ok: false, tooLong: false, message: "No asset returned" };
    return { ok: true, asset_id };
  };

  const handleNarrateSections = async () => {
    if (!selectedVoice) return;
    setNarrating(true);
    setNarrateProgress(null);

    // working copy without prior section players
    const working = blocks.filter(
      (b) => !(b.block_type === "embed_audio" && (b.config as any)?.voiceover_kind === "section"),
    );
    // recompute sections from cleaned
    const cleanSections = groupSections(working);

    // Build insertion plan: by section index, find heading id (or null)
    let next = [...working];
    let success = 0;
    const failures: string[] = [];

    for (let i = 0; i < cleanSections.length; i++) {
      const s = cleanSections[i];
      setNarrateProgress(`Generating section ${i + 1} of ${cleanSections.length}…`);
      const res = await generateOne(s.text, selectedVoice);
      if (!res.ok) {
        failures.push(
          res.tooLong
            ? `Section ${i + 1} too long to narrate in one piece — split it`
            : `Section ${i + 1}: ${res.message}`,
        );
        continue;
      }
      onRegisterAsset(res.asset_id!);
      const newBlock: EditorBlock = {
        client_id: crypto.randomUUID(),
        block_type: "embed_audio",
        config: {
          asset_id: res.asset_id!,
          transcript: s.text,
          background_color: null,
          padding: "none",
          voiceover_kind: "section",
        },
      };
      if (s.heading) {
        const idx = next.findIndex((b) => b.client_id === s.heading!.client_id);
        if (idx >= 0) {
          next = [...next.slice(0, idx + 1), newBlock, ...next.slice(idx + 1)];
        } else {
          next = [...next, newBlock];
        }
      } else {
        next = [newBlock, ...next];
      }
      success++;
    }

    onApplyBlocks(next);
    setNarrating(false);
    setNarrateProgress(null);
    if (failures.length === 0) {
      toast({ title: `Narrated ${success} section${success === 1 ? "" : "s"}` });
    } else {
      toast({
        title: `Narrated ${success} of ${cleanSections.length}; ${failures.length} failed`,
        description: failures.join("\n"),
        variant: "destructive",
      });
    }
  };

  const handleStandalone = async () => {
    if (!selectedVoice) return;
    const text = standaloneText.trim();
    if (!text) return;
    setStandaloneBusy(true);
    const res = await generateOne(text, selectedVoice);
    setStandaloneBusy(false);
    if (!res.ok) {
      toast({
        title: res.tooLong ? "Text too long" : "Could not generate clip",
        description: res.tooLong ? "Maximum 5000 characters per clip." : res.message,
        variant: "destructive",
      });
      return;
    }
    onRegisterAsset(res.asset_id!);
    const newBlock: EditorBlock = {
      client_id: crypto.randomUUID(),
      block_type: "embed_audio",
      config: {
        asset_id: res.asset_id!,
        transcript: text,
        background_color: null,
        padding: "none",
        voiceover_kind: "standalone",
      },
    };
    onApplyBlocks([...blocks, newBlock]);
    setStandaloneText("");
    toast({
      title: "Audio clip added",
      description: "Appended to the end of the lesson — drag to reposition.",
    });
  };

  const handleGenerateScripted = async () => {
    if (!selectedVoice) return;
    setScripting(true);
    setScriptProgress(null);
    let next = [...blocks];
    let success = 0;
    const failures: string[] = [];
    const pending = blocks.filter(
      (b) =>
        b.block_type === "embed_audio" &&
        typeof (b.config as any)?.script === "string" &&
        ((b.config as any).script as string).trim().length > 0 &&
        !(b.config as any)?.asset_id,
    );
    for (let i = 0; i < pending.length; i++) {
      const blk = pending[i];
      const script = ((blk.config as any).script as string).trim();
      setScriptProgress(`Generating clip ${i + 1} of ${pending.length}…`);
      const res = await generateOne(script, selectedVoice);
      if (!res.ok) {
        failures.push(
          res.tooLong
            ? `Clip ${i + 1} script too long (max 5000 chars) — shorten it`
            : `Clip ${i + 1}: ${res.message}`,
        );
        continue;
      }
      onRegisterAsset(res.asset_id!);
      const idx = next.findIndex((b) => b.client_id === blk.client_id);
      if (idx >= 0) {
        const cfg = next[idx].config as any;
        const existingTranscript =
          typeof cfg.transcript === "string" && cfg.transcript.trim().length > 0
            ? cfg.transcript
            : script;
        next = [
          ...next.slice(0, idx),
          { ...next[idx], config: { ...cfg, asset_id: res.asset_id!, transcript: existingTranscript } },
          ...next.slice(idx + 1),
        ];
      }
      success++;
    }
    onApplyBlocks(next);
    setScripting(false);
    setScriptProgress(null);
    if (failures.length === 0) {
      toast({ title: `Generated ${success} scripted clip${success === 1 ? "" : "s"}` });
    } else {
      toast({
        title: `Generated ${success} of ${pending.length}; ${failures.length} failed`,
        description: failures.join("\n"),
        variant: "destructive",
      });
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <div className="text-base font-semibold">AI voiceover</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Generate ElevenLabs narration for this lesson. Pick a voice, then narrate every
              section, or add a single standalone clip.
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto p-4">
          {/* Voice picker */}
          <section className="space-y-2">
            <div className="text-sm font-semibold">Voice</div>
            {voicesLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading voices…
              </div>
            )}
            {voicesError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {voicesError}
              </div>
            )}
            {!voicesLoading && voices && voices.length === 0 && !voicesError && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No voices available on this account.
              </div>
            )}
            <div className="space-y-1">
              {voices?.map((v) => {
                const isSelected = selectedVoice === v.voice_id;
                const isPlaying = previewingId === v.voice_id;
                return (
                  <div
                    key={v.voice_id}
                    className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => pickVoice(v.voice_id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          isSelected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span className="font-medium">{v.name}</span>
                      {v.category && (
                        <span className="text-xs text-muted-foreground">· {v.category}</span>
                      )}
                    </button>
                    {v.preview_url && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => (isPlaying ? stopPreview() : playPreview(v))}
                        aria-label={isPlaying ? "Stop preview" : "Play preview"}
                      >
                        {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Generate AI-scripted clips */}
          <section className="space-y-2">
            <div className="text-sm font-semibold">Generate scripted clips</div>
            <div className="text-xs text-muted-foreground">
              Generates narration for audio blocks the AI wrote a script for (added by the lesson
              builder) and fills in their audio in place. Already-generated clips are skipped.
            </div>
            <div className="text-xs text-muted-foreground">
              {scriptedPending.length === 0
                ? "No scripted audio blocks awaiting generation."
                : `${scriptedPending.length} scripted clip${scriptedPending.length === 1 ? "" : "s"} ready to generate.`}
            </div>
            {scriptProgress && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> {scriptProgress}
              </div>
            )}
            <Button
              type="button"
              onClick={handleGenerateScripted}
              disabled={!selectedVoice || scriptedPending.length === 0 || scripting || narrating || standaloneBusy}
            >
              {scripting ? "Generating…" : "Generate scripted clips"}
            </Button>
          </section>

          {/* Narrate each section */}
          <section className="space-y-2">
            <div className="text-sm font-semibold">Narrate each section</div>
            <div className="text-xs text-muted-foreground">
              Reads on-screen text section by section and inserts an audio player at the top of
              each. Previous section players are replaced; standalone clips are kept.
            </div>
            <div className="text-xs text-muted-foreground">
              {sections.length === 0
                ? "No narratable sections found."
                : `${sections.length} section${sections.length === 1 ? "" : "s"} will be narrated.`}
            </div>
            {narrateProgress && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> {narrateProgress}
              </div>
            )}
            <Button
              type="button"
              onClick={handleNarrateSections}
              disabled={!selectedVoice || sections.length === 0 || narrating || standaloneBusy || scripting}
            >
              {narrating ? "Narrating…" : "Narrate each section"}
            </Button>
          </section>

          {/* Standalone clip */}
          <section className="space-y-2">
            <div className="text-sm font-semibold">Add a standalone clip</div>
            <div className="text-xs text-muted-foreground">
              Generate one audio block from your own narration text. Appended to the end of the
              lesson.
            </div>
            <Textarea
              value={standaloneText}
              onChange={(e) => setStandaloneText(e.target.value)}
              placeholder="Type narration text…"
              rows={5}
              maxLength={5000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {standaloneText.length} / 5000
              </span>
              <Button
                type="button"
                onClick={handleStandalone}
                disabled={
                  !selectedVoice || standaloneText.trim().length === 0 || standaloneBusy || narrating || scripting
                }
              >
                {standaloneBusy ? "Generating…" : "Generate clip"}
              </Button>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t p-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={narrating || standaloneBusy}>
            Close
          </Button>
        </div>
      </aside>
    </>
  );
}

export default LessonVoiceoverPanel;
