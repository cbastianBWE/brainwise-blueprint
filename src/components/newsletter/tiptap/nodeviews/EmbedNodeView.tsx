import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical, Film, Pencil, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { buildEmbedSrc } from "../nodes/Embed";
import type { EmbedProvider } from "../types";

/**
 * Parse an arbitrary user-supplied URL into (provider, embed_id, url) per the
 * same logic the convert-html-to-tiptap Edge Function's walkIframe uses.
 *
 * Returns `provider: 'generic'` for anything that isn't a known provider, so
 * the user gets an iframe of the raw URL (https-only via buildEmbedSrc).
 */
export function parseEmbedUrl(input: string): {
  provider: EmbedProvider;
  embed_id: string;
  url: string;
} {
  const url = input.trim();
  if (!url) return { provider: "generic", embed_id: "", url: "" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { provider: "generic", embed_id: "", url };
  }
  const host = parsed.hostname.toLowerCase();

  // YouTube
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    if (id) return { provider: "youtube", embed_id: id, url };
  }
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = parsed.searchParams.get("v");
    if (v) return { provider: "youtube", embed_id: v, url };
    const m = parsed.pathname.match(/\/embed\/([^/?#]+)/);
    if (m?.[1]) return { provider: "youtube", embed_id: m[1], url };
    const s = parsed.pathname.match(/\/shorts\/([^/?#]+)/);
    if (s?.[1]) return { provider: "youtube", embed_id: s[1], url };
  }

  // Vimeo
  if (host.endsWith("vimeo.com") || host.endsWith("player.vimeo.com")) {
    const m = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    if (m?.[1]) return { provider: "vimeo", embed_id: m[1], url };
  }

  // Spotify
  if (host.endsWith("spotify.com")) {
    const m = parsed.pathname.match(
      /\/(?:embed\/)?(episode|track|playlist|album|show)\/([A-Za-z0-9]+)/,
    );
    if (m?.[1] && m?.[2]) {
      return {
        provider: "spotify",
        embed_id: `${m[1]}:${m[2]}`,
        url,
      };
    }
  }

  return { provider: "generic", embed_id: "", url };
}

export function EmbedNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const provider: EmbedProvider = (node.attrs.provider ?? "youtube") as EmbedProvider;
  const embed_id: string = node.attrs.embed_id ?? "";
  const url: string = node.attrs.url ?? "";
  const title: string = node.attrs.title ?? "";
  const aspectRatio: "16:9" | "4:3" | "1:1" | "9:16" =
    (node.attrs.aspect_ratio ?? "16:9") as "16:9" | "4:3" | "1:1" | "9:16";

  const configured = !!embed_id || (provider === "generic" && !!url);
  const iframeSrc = configured ? buildEmbedSrc(provider, embed_id, url) : "";

  const [dialogOpen, setDialogOpen] = useState<boolean>(!configured ? false : false);
  const [inputUrl, setInputUrl] = useState<string>(url);
  const [inputTitle, setInputTitle] = useState<string>(title);
  const [inputAspect, setInputAspect] = useState<"16:9" | "4:3" | "1:1" | "9:16">(
    aspectRatio,
  );
  const [genericWarning, setGenericWarning] = useState<string | null>(null);

  const aspectClass =
    ({
      "16:9": "aspect-video",
      "4:3": "aspect-[4/3]",
      "1:1": "aspect-square",
      "9:16": "aspect-[9/16] mx-auto max-w-[400px]",
    } as const)[aspectRatio] || "aspect-video";

  const openDialog = () => {
    setInputUrl(url);
    setInputTitle(title);
    setInputAspect(aspectRatio);
    setGenericWarning(null);
    setDialogOpen(true);
  };

  const submit = () => {
    const parsed = parseEmbedUrl(inputUrl);
    if (parsed.provider === "generic") {
      if (!isSafeHttpUrl(parsed.url)) {
        setGenericWarning("URL must be https.");
        return;
      }
      setGenericWarning(
        "Unknown provider — using generic iframe. Must be https.",
      );
    }
    updateAttributes({
      provider: parsed.provider,
      embed_id: parsed.embed_id,
      url: parsed.url,
      title: inputTitle.trim() || null,
      aspect_ratio: inputAspect,
    });
    setDialogOpen(false);
  };

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-embed="true"
      className={cn(
        "group/nl-embed relative my-6 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      {/* Hover affordances */}
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1 py-1 shadow-md transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-embed:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={openDialog}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--fg-2)] transition-colors hover:bg-[var(--bw-cream-200)]"
        >
          <Pencil className="h-3 w-3" />
          Edit URL
        </button>
        <button
          type="button"
          onClick={deleteNode}
          className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Delete embed"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-embed:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      {configured ? (
        iframeSrc ? (
          <div className={cn("w-full overflow-hidden rounded-lg bg-black", aspectClass)}>
            <iframe
              src={iframeSrc}
              title={title || "Embedded media"}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[var(--danger)] bg-red-50 p-6 text-center">
            <AlertTriangle className="h-7 w-7 text-[var(--danger)]" />
            <div className="text-sm font-semibold text-[var(--danger)]">
              Invalid embed URL
            </div>
            <code className="block max-w-full truncate font-mono text-[11px] text-[var(--fg-3)]">
              {url}
            </code>
            <Button size="sm" variant="outline" onClick={openDialog} className="mt-2">
              Edit URL
            </Button>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border-2)] bg-[var(--bw-cream-300)] text-[var(--fg-3)] transition-colors hover:border-[#F5741A] hover:bg-[var(--bw-cream-200)] hover:text-[#F5741A]"
        >
          <Film className="h-7 w-7" />
          <div className="text-sm font-medium">Embed: YouTube, Vimeo, or Spotify</div>
          <div className="text-[11px]">Click to paste a URL</div>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Embed media</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--fg-2)]">
                URL
              </label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--fg-2)]">
                Title (optional)
              </label>
              <Input
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="Accessible label"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--fg-2)]">
                Aspect ratio
              </label>
              <select
                value={inputAspect}
                onChange={(e) =>
                  setInputAspect(
                    e.target.value as "16:9" | "4:3" | "1:1" | "9:16",
                  )
                }
                className="mt-1 block w-full rounded-md border border-[var(--border-1)] bg-white px-3 py-2 text-sm text-[var(--fg-1)] focus:border-[#F5741A] focus:outline-none"
              >
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="4:3">4:3 (Standard)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical)</option>
              </select>
            </div>
            {genericWarning && (
              <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{genericWarning}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Embed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
}
