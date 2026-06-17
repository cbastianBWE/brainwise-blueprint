import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ChevronDown, X, Plus, Trash2, Wand2 } from "lucide-react";
import { RichTextEditor } from "../RichTextEditor";
import { useLessonBlockAssetUrls } from "../useLessonBlockAssetUrls";
import type { TipTapDocJSON } from "../blockTypeMeta";

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function tiptapToPlainText(doc: any): string {
  if (!doc || typeof doc !== "object") return "";
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === "string") parts.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}


interface Hotspot {
  client_id: string;
  x: number;
  y: number;
  label: string;
  content: TipTapDocJSON;
}

interface HotspotBlockValue {
  asset_id: string | null;
  alt: string;
  attribution: string | null;
  instructions: string | null;
  hotspots: Hotspot[];
  gating_required: boolean;
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
  value: HotspotBlockValue;
  onConfigChange: (next: HotspotBlockValue) => void;
  contentItemId?: string;
}

const MAX_HOTSPOTS = 12;

export function HotspotBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const { toast } = useToast();
  const { urlMap, registerNewAssetId } = useLessonBlockAssetUrls(contentItemId);
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [ingestingId, setIngestingId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoPlacing, setAutoPlacing] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const canSearchPexels = !!contentItemId;
  const hotspots = value.hotspots ?? [];
  const atCap = hotspots.length >= MAX_HOTSPOTS;

  useEffect(() => {
    if (value.asset_id) registerNewAssetId(value.asset_id);
  }, [value.asset_id, registerNewAssetId]);

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
      registerNewAssetId(data.asset_id);
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

  const updateHotspots = (next: Hotspot[]) =>
    onConfigChange({ ...value, hotspots: next });

  const handleCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (atCap || !value.asset_id) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - box.top) / box.height) * 100));
    updateHotspots([
      ...hotspots,
      { client_id: crypto.randomUUID(), x, y, label: "", content: emptyDoc() },
    ]);
  };

  const updateOne = (id: string, patch: Partial<Hotspot>) =>
    updateHotspots(hotspots.map((h) => (h.client_id === id ? { ...h, ...patch } : h)));

  const removeOne = (id: string) =>
    updateHotspots(hotspots.filter((h) => h.client_id !== id));

  const imgUrl = value.asset_id ? urlMap.get(value.asset_id) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image *</Label>
        <FileUploadField
          assetKind="image"
          contentItemId={contentItemId ?? null}
          refField="image_asset"
          value={value.asset_id}
          onChange={(newAssetId) => {
            if (newAssetId) registerNewAssetId(newAssetId);
            onConfigChange({ ...value, asset_id: newAssetId });
          }}
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
      </div>

      <div className="space-y-2">
        <Label>Instructions (optional)</Label>
        <Input
          value={value.instructions ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            onConfigChange({ ...value, instructions: next.trim() === "" ? null : next });
          }}
          placeholder="e.g. Click each marker to learn more"
        />
      </div>

      {value.attribution && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1">
          <span className="text-xs italic text-muted-foreground">{value.attribution}</span>
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

      {imgUrl ? (
        <div className="space-y-2">
          <Label>Placement ({hotspots.length} / {MAX_HOTSPOTS})</Label>
          <p className="text-xs text-muted-foreground">
            Click anywhere on the image to add a hotspot.
          </p>
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="bw-hotspot-canvas"
            style={{ cursor: atCap ? "not-allowed" : "crosshair" }}
          >
            <img src={imgUrl} alt={value.alt || ""} className="max-h-[480px] w-full object-contain" />
            {hotspots.map((h, idx) => (
              <span
                key={h.client_id}
                className="bw-hotspot-marker"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {idx + 1}
              </span>
            ))}
          </div>
          {hotspots.length < 2 && (
            <p className="text-xs text-muted-foreground">
              Tip: add at least two hotspots so learners have something to explore.
            </p>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
          Choose an image to start placing hotspots.
        </div>
      )}

      {hotspots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Hotspots</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atCap || !value.asset_id}
              onClick={() =>
                updateHotspots([
                  ...hotspots,
                  { client_id: crypto.randomUUID(), x: 50, y: 50, label: "", content: emptyDoc() },
                ])
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Add hotspot
            </Button>
          </div>
          {hotspots.map((h, idx) => (
            <div key={h.client_id} className="space-y-2 rounded-md border bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bw-hotspot-marker" style={{ position: "static", transform: "none" }}>
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium">Hotspot {idx + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOne(h.client_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={Number.isFinite(h.x) ? h.x : 0}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      updateOne(h.client_id, { x: Math.max(0, Math.min(100, Number.isNaN(n) ? 0 : n)) });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={Number.isFinite(h.y) ? h.y : 0}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      updateOne(h.client_id, { y: Math.max(0, Math.min(100, Number.isNaN(n) ? 0 : n)) });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={h.label}
                  onChange={(e) => updateOne(h.client_id, { label: e.target.value })}
                  placeholder="Short title shown in the popover"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Content</Label>
                <RichTextEditor
                  value={h.content}
                  onChange={(next) => updateOne(h.client_id, { content: next })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
        <Switch
          id="hotspot-gating"
          checked={value.gating_required === true}
          onCheckedChange={(checked) =>
            onConfigChange({ ...value, gating_required: checked === true })
          }
        />
        <div className="space-y-1">
          <Label htmlFor="hotspot-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must open every hotspot before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
