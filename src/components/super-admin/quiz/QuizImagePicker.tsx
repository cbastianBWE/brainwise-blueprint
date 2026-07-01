import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Loader2, Search, Wand2, ImageIcon } from "lucide-react";

interface PexelsCandidate {
  pexels_id: number | string;
  src_large: string;
  src_thumb: string;
  photographer_name: string;
  photographer_url: string;
  photo_page_url: string;
  alt: string;
}

interface Props {
  parentKind: "quiz_question" | "quiz_answer_option";
  parentId: string | null;
  currentAssetId: string | null;
  onAttached: (assetId: string) => void;
  previewUrl?: string | null;
}

export function QuizImagePicker({
  parentKind,
  parentId,
  currentAssetId,
  onAttached,
  previewUrl,
}: Props) {
  const { toast } = useToast();
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [ingestingId, setIngestingId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enabled = !!parentId;
  const hint = "Save the question first to add an image.";

  async function readEdgeError(e: any, fallback: string): Promise<string> {
    let msg = e?.message ?? fallback;
    try {
      const body = await e?.context?.json?.();
      if (body?.message) msg = body.message;
      else if (body?.error) msg = body.error;
    } catch {
      /* keep msg */
    }
    return msg;
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "newsletter-image-search",
        { body: { query: query.trim(), count: 4 } },
      );
      if (error) throw error;
      setCandidates((data?.candidates ?? []) as PexelsCandidate[]);
      if (!data?.candidates?.length) setErrorMsg("No results found.");
    } catch (e: any) {
      const msg = await readEdgeError(e, "Search failed");
      setErrorMsg(msg);
      toast({ title: "Pexels search failed", description: msg, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function pickCandidate(c: PexelsCandidate) {
    if (!parentId) return;
    setIngestingId(c.pexels_id);
    setErrorMsg(null);
    try {
      const body: Record<string, unknown> = {
        pexels_id: c.pexels_id,
        src_large_url: c.src_large,
        photo_page_url: c.photo_page_url,
        photographer_name: c.photographer_name,
        photographer_url: c.photographer_url,
        alt: c.alt,
      };
      body[parentKind === "quiz_question" ? "quiz_question_id" : "quiz_answer_option_id"] =
        parentId;
      const { data, error } = await supabase.functions.invoke(
        "lesson-ingest-pexels-asset",
        { body },
      );
      if (error) throw error;
      if (!data?.asset_id) throw new Error("No asset returned");
      onAttached(data.asset_id);
      setCandidates([]);
      toast({ title: "Image added from Pexels" });
    } catch (e: any) {
      const msg = await readEdgeError(e, "Failed to import image");
      setErrorMsg(msg);
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setIngestingId(null);
    }
  }

  async function generateWithAi() {
    if (!parentId || !prompt.trim()) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("openai-image-generate", {
        body: {
          prompt: prompt.trim(),
          parent_kind: parentKind,
          parent_id: parentId,
          ref_field: parentKind === "quiz_question" ? "question_image" : "option_image",
        },
      });
      if (error) throw error;
      if (!data?.asset_id) throw new Error(data?.message || "No image returned");
      onAttached(data.asset_id);
      toast({ title: "Image generated" });
    } catch (e: any) {
      const msg = await readEdgeError(e, "Generation failed");
      setErrorMsg(msg);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="max-h-32 rounded border object-contain"
        />
      ) : currentAssetId ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Image attached
        </div>
      ) : null}

      {!enabled && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      <Collapsible open={pexelsOpen} onOpenChange={setPexelsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between"
            disabled={!enabled}
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Search Pexels
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${pexelsOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. team collaboration"
              disabled={!enabled || searching}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
            />
            <Button
              type="button"
              onClick={runSearch}
              disabled={!enabled || searching || !query.trim()}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          {candidates.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {candidates.map((c) => {
                const isLoading = ingestingId === c.pexels_id;
                return (
                  <button
                    key={c.pexels_id}
                    type="button"
                    onClick={() => pickCandidate(c)}
                    disabled={ingestingId !== null}
                    className="group relative overflow-hidden rounded-md border bg-muted/20 transition hover:ring-2 hover:ring-primary disabled:opacity-50"
                  >
                    <img
                      src={c.src_thumb}
                      alt={c.alt || c.photographer_name}
                      className="h-20 w-full object-cover"
                    />
                    <div className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">
                      {c.photographer_name}
                    </div>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between"
            disabled={!enabled}
          >
            <span className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Generate with AI
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${aiOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image to generate"
            rows={3}
            disabled={!enabled || generating}
          />
          <Button
            type="button"
            onClick={generateWithAi}
            disabled={!enabled || generating || !prompt.trim()}
            className="w-full"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating (this can take ~15s)…
              </span>
            ) : (
              "Generate image"
            )}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
