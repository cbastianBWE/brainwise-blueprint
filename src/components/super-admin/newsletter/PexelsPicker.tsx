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
      return;
    }
    const seed = (initialQuery ?? "").trim();
    setQuery(initialQuery ?? "");
    setDebouncedQuery(seed.length >= 2 ? seed : "");
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

  const showEmptyHint = !isSearching && !searchError && candidates.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert a stock image from Pexels</DialogTitle>
          <DialogDescription>
            Search Pexels and pick an image. Photographer attribution will be
            added automatically and is required by the Pexels license.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b pb-3">
          <Input
            placeholder="Search Pexels (e.g. leadership, mountain sunset)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {(searchError || ingestError) && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ingestingPexelsId != null}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
