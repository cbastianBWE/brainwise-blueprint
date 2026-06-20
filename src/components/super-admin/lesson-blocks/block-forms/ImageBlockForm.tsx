import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ChevronDown, X, Wand2 } from "lucide-react";

interface ImageBlockValue {
  asset_id: string | null;
  alt: string;
  caption: string | null;
  attribution: string | null;
  image_prompt?: string | null;
  [key: string]: unknown;
}

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
  value: ImageBlockValue;
  onConfigChange: (next: ImageBlockValue) => void;
  contentItemId?: string;
}

export function ImageBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const { toast } = useToast();
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [ingestingId, setIngestingId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canSearchPexels = !!contentItemId;

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
      if (!data?.candidates?.length) {
        setErrorMsg("No results found.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Search failed");
      toast({ title: "Pexels search failed", description: e?.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function pickCandidate(candidate: PexelsCandidate) {
    if (!contentItemId) return;
    setIngestingId(candidate.pexels_id);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "lesson-ingest-pexels-asset",
        {
          body: {
            content_item_id: contentItemId,
            pexels_id: candidate.pexels_id,
            src_large_url: candidate.src_large,
            photo_page_url: candidate.photo_page_url,
            photographer_name: candidate.photographer_name,
            photographer_url: candidate.photographer_url,
            alt: candidate.alt,
          },
        },
      );
      if (error) throw error;
      if (!data?.asset_id) throw new Error("No asset returned");
      onConfigChange({
        ...value,
        asset_id: data.asset_id,
        attribution: `Photo by ${candidate.photographer_name} on Pexels`,
        alt: value.alt && value.alt.trim() ? value.alt : candidate.alt,
      });
      setCandidates([]);
      toast({ title: "Image added from Pexels" });
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to import image");
      toast({ title: "Import failed", description: e?.message, variant: "destructive" });
    } finally {
      setIngestingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Image *</Label>
        <FileUploadField
          assetKind="image"
          contentItemId={contentItemId ?? null}
          refField="image_asset"
          value={value.asset_id}
          onChange={(newAssetId) =>
            onConfigChange({ ...value, asset_id: newAssetId })
          }
        />
      </div>

      <Collapsible open={pexelsOpen} onOpenChange={setPexelsOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Search Pexels
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${pexelsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          {!canSearchPexels && (
            <p className="text-xs text-muted-foreground">
              Save the lesson first to use Pexels.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. team collaboration"
              disabled={!canSearchPexels || searching}
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
              disabled={!canSearchPexels || searching || !query.trim()}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}
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
                      className="h-24 w-full object-cover"
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

      <div className="space-y-2">
        <Label>Alt text *</Label>
        <Input
          value={value.alt ?? ""}
          onChange={(e) => onConfigChange({ ...value, alt: e.target.value })}
          placeholder="Describe the image for screen readers"
        />
        <p className="text-xs text-muted-foreground">
          Required for accessibility.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Caption (optional)</Label>
        <Input
          value={value.caption ?? ""}
          onChange={(e) =>
            onConfigChange({ ...value, caption: e.target.value || null })
          }
          placeholder="Caption shown below the image"
        />
      </div>
      {value.attribution && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1">
          <span className="text-xs italic text-muted-foreground">
            {value.attribution}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onConfigChange({ ...value, attribution: null })}
          >
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
}
