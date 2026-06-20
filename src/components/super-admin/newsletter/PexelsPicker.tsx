import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { mapPexelsError } from "./mapPexelsError";

// Mirror ImportHtmlModal.tsx raw-fetch pattern (supabase-js .invoke doesn't
// accept AbortSignal across versions — go raw to honor cancellation).
const SUPABASE_URL = "https://svprhtzawnbzmumxnhsq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cHJodHphd25iem11bXhuaHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MDQsImV4cCI6MjA5MTI1MzYwNH0.R9WzFR4olqp1tdWa-pj-2WSL2L0Mjcf2tSA8LhOWclA";

export interface NewsletterImageAttribution {
  source: "pexels" | null;
  photographer: string;
  photographer_url: string;
  source_url: string;
}

interface PexelsCandidate {
  pexels_id: number;
  src_large: string;
  src_thumb: string;
  photographer_name: string;
  photographer_url: string;
  photo_page_url: string;
  alt: string;
}

interface PexelsPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  initialQuery?: string;
  onPicked: (result: {
    asset_id: string;
    attribution: NewsletterImageAttribution | null;
    alt: string;
  }) => void;
}

export default function PexelsPicker({
  open,
  onOpenChange,
  articleId,
  initialQuery,
  onPicked,
}: PexelsPickerProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    (initialQuery ?? "").trim().length >= 2 ? (initialQuery ?? "").trim() : "",
  );
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [ingestingPexelsId, setIngestingPexelsId] = useState<number | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAspect, setAiAspect] = useState<"square" | "landscape" | "portrait">("landscape");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset internal state when the modal closes; seed query when it opens.
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setCandidates([]);
      setIsSearching(false);
      setSearchError(null);
      setIngestingPexelsId(null);
      setIngestError(null);
      setAiPrompt("");
      setAiAspect("landscape");
      setAiGenerating(false);
      setAiError(null);
      return;
    }
    const seed = (initialQuery ?? "").trim();
    setQuery(initialQuery ?? "");
    setDebouncedQuery(seed.length >= 2 ? seed : "");
    setAiPrompt(initialQuery ?? "");
    setAiError(null);
  }, [open, initialQuery]);

  // Debounce typed queries (skipped on initial open since debouncedQuery is
  // seeded immediately above).
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery("");
      return;
    }
    if (trimmed === debouncedQuery) return;
    const t = setTimeout(() => setDebouncedQuery(trimmed), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Run the search whenever the debounced query changes.
  useEffect(() => {
    if (!open) return;
    if (!debouncedQuery) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setSearchError("Not signed in.");
          setCandidates([]);
          setIsSearching(false);
          return;
        }
        const resp = await fetch(
          `${SUPABASE_URL}/functions/v1/newsletter-image-search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ query: debouncedQuery, count: 4 }),
            signal: controller.signal,
          },
        );
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const code = (data as { error?: string; code?: string })?.error
            ?? (data as { code?: string })?.code
            ?? "search_failed";
          setSearchError(mapPexelsError(code));
          setCandidates([]);
          return;
        }
        const data = await resp.json();
        setCandidates((data?.candidates as PexelsCandidate[]) ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setSearchError("Search failed. Try again.");
        setCandidates([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, open]);

  async function handlePick(candidate: PexelsCandidate) {
    if (ingestingPexelsId != null) return;
    setIngestingPexelsId(candidate.pexels_id);
    setIngestError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-pexels-asset", {
        body: {
          article_id: articleId,
          pexels_id: candidate.pexels_id,
          src_large_url: candidate.src_large,
          photo_page_url: candidate.photo_page_url,
          photographer_name: candidate.photographer_name,
          photographer_url: candidate.photographer_url,
          alt: candidate.alt,
        },
      });
      if (error) {
        setIngestError(mapPexelsError(error.message || "ingest_failed"));
        return;
      }
      const payload = data as {
        asset_id?: string;
        attribution?: NewsletterImageAttribution;
      } | null;
      if (!payload?.asset_id || !payload.attribution) {
        setIngestError("Ingest returned no asset id.");
        return;
      }
      onPicked({
        asset_id: payload.asset_id,
        attribution: payload.attribution,
        alt: candidate.alt,
      });
    } catch (e) {
      setIngestError(mapPexelsError((e as Error).message || "ingest_failed"));
    } finally {
      setIngestingPexelsId(null);
    }
  }

  async function handleGenerate() {
    const prompt = aiPrompt.trim();
    if (prompt.length < 3 || aiGenerating) return;
    setAiGenerating(true);
    setAiError(null);
    const size = aiAspect === "square" ? "1024x1024" : aiAspect === "portrait" ? "1024x1536" : "1536x1024";
    try {
      const { data, error } = await supabase.functions.invoke("openai-image-generate", {
        body: { prompt, parent_kind: "newsletter_article", parent_id: articleId, ref_field: "inline_image", size },
      });
      if (error) {
        let msg = "Generation failed. Try again.";
        try {
          const ctx = (error as { context?: Response }).context;
          const j = ctx ? await ctx.json() : null;
          const code = j?.error ?? "";
          if (code === "rate_limited_max_per_hour") msg = "Hourly AI image limit reached. Try again later.";
          else if (code === "IMPERSONATION_DENIED") msg = "AI image generation is not allowed during impersonation.";
          else if (code === "prompt_too_long_max_4000") msg = "Prompt is too long (max 4000 characters).";
          else if (code === "openai_timeout") msg = "The image took too long to generate. Try again.";
          else if (j?.message) msg = j.message;
        } catch { /* keep default */ }
        setAiError(msg);
        return;
      }
      const payload = data as { asset_id?: string } | null;
      if (!payload?.asset_id) { setAiError("Generation returned no image."); return; }
      onPicked({ asset_id: payload.asset_id, attribution: null, alt: prompt.slice(0, 120) });
      onOpenChange(false);
    } catch (e) {
      setAiError((e as Error).message || "Generation failed. Try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  const showEmptyHint = !isSearching && !searchError && candidates.length === 0;

  const aspects: Array<{ value: "square" | "landscape" | "portrait"; label: string }> = [
    { value: "square", label: "Square" },
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert an image</DialogTitle>
          <DialogDescription>
            Search Pexels for a stock photo, or generate an original image with AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="stock" className="flex-1 flex flex-col min-h-0">
          <TabsList>
            <TabsTrigger value="stock">Stock photos</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Generate with AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="border-b pb-3">
              <Input
                placeholder="Search Pexels (e.g. leadership, mountain sunset)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {(searchError || ingestError) && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {ingestError ?? searchError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-3">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : showEmptyHint && !debouncedQuery ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search Pexels.
                </div>
              ) : showEmptyHint ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No results for "{debouncedQuery}". Try different keywords.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {candidates.map((c) => {
                    const isThisIngesting = ingestingPexelsId === c.pexels_id;
                    const otherIngesting =
                      ingestingPexelsId != null && !isThisIngesting;
                    return (
                      <button
                        key={c.pexels_id}
                        type="button"
                        onClick={() => handlePick(c)}
                        disabled={otherIngesting || isThisIngesting}
                        className={cn(
                          "group relative text-left rounded-md border p-2 transition-all hover:ring-1 hover:ring-[#006D77]/40 disabled:cursor-not-allowed",
                          otherIngesting && "opacity-50",
                        )}
                      >
                        <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                          <img
                            src={c.src_thumb}
                            alt={c.alt}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {isThisIngesting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                              <Loader2 className="h-6 w-6 animate-spin text-[#006D77]" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground truncate">
                          Photo by {c.photographer_name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col min-h-0 mt-3 space-y-3">
            <Textarea
              placeholder="Describe the image you want, e.g. 'a calm minimalist desk with a single plant, soft morning light'"
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiGenerating}
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Aspect:</span>
              <div className="inline-flex rounded-md border overflow-hidden">
                {aspects.map((a) => {
                  const active = aiAspect === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAiAspect(a.value)}
                      disabled={aiGenerating}
                      className={cn(
                        "px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed",
                        active ? "text-white" : "bg-background hover:bg-muted",
                      )}
                      style={active ? { backgroundColor: "#006D77" } : undefined}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {aiError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {aiError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={aiPrompt.trim().length < 3 || aiGenerating}
                style={{ backgroundColor: "#006D77" }}
                className="text-white hover:opacity-90"
              >
                {aiGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating… this can take up to a minute
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </span>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ingestingPexelsId != null || aiGenerating}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
