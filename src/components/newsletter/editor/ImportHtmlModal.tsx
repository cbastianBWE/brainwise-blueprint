/**
 * H4 — HTML import modal (client-side conversion).
 *
 * Pipeline:
 *   1. Read file or paste -> raw HTML string.
 *   2. Parse with browser DOMParser.
 *   3. Collect <img> srcs, split data: URIs from network URIs.
 *   4. Client-side preflight on network image count (MAX_IMAGES_PER_IMPORT).
 *   5. POST network URLs to import-html-images Edge Function (fetch+upload only).
 *   6. Merge data-URI synthetic failures into resolutions map.
 *   7. Rewrite every <img> into a synthetic <figure data-newsletter-image> shell
 *      so newsletterImage's parseHTML rule fires inside generateJSON.
 *   8. generateJSON(body.innerHTML, buildExtensions({editable:false})).
 *   9. Preview + confirm.
 *
 * AbortController note: supabase-js's functions.invoke does not accept
 * AbortSignal, so we issue a raw fetch against the function URL using the
 * current session's access token. This gives real cancel semantics.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import { generateJSON } from "@tiptap/core";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileUp,
  Loader2,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { buildExtensions, NewsletterImage, NewsletterEmbed } from "@/components/newsletter/tiptap";
import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";
import ImageReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/ImageReaderNodeView";
import EmbedReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/EmbedReaderNodeView";
import { tipTapDocToPlainText } from "@/components/newsletter/versions/tipTapDocToPlainText";

const SUPABASE_URL = "https://svprhtzawnbzmumxnhsq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cHJodHphd25iem11bXhuaHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MDQsImV4cCI6MjA5MTI1MzYwNH0.R9WzFR4olqp1tdWa-pj-2WSL2L0Mjcf2tSA8LhOWclA";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_IMPORT = 30;

export type ConversionFailure = {
  kind:
    | "image_fetch"
    | "image_upload"
    | "size_exceeded"
    | "mime_rejected"
    | "ssrf_blocked"
    | "scheme_rejected"
    | "redirect_loop"
    | "phase_deadline_exceeded";
  detail: string;
  original_src?: string;
};

export interface ConversionResponse {
  tiptap_doc: NewsletterTipTapDoc;
  stats: {
    total_images_attempted: number;
    images_succeeded: number;
    images_failed: number;
  };
  failures: ConversionFailure[];
}

interface ImageResolution {
  asset_id: string | null;
  failure?: { kind: ConversionFailure["kind"]; detail: string };
}

interface ImportImagesResponse {
  resolutions: Record<string, ImageResolution>;
  stats: {
    total_attempted: number;
    succeeded: number;
    failed: number;
  };
}

type ImportState =
  | { phase: "idle" }
  | { phase: "reading_file"; filename: string }
  | { phase: "converting"; sizeBytes: number; subLabel?: string }
  | { phase: "success"; result: ConversionResponse; previewText: string }
  | { phase: "error"; error: { code: string; message?: string } };

interface ImportHtmlModalProps {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (newBodyTiptap: NewsletterTipTapDoc) => void;
  /**
   * Optional HTML to feed straight into the conversion pipeline when the
   * modal opens (e.g. AI co-pilot generated HTML). When set, the idle
   * drop/paste UI is skipped and runConversion(initialHtml) fires once.
   * Parent should clear this prop when onOpenChange(false) fires so a
   * subsequent reopen with the same html doesn't auto-retrigger.
   */
  initialHtml?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  html_parse_failed: "Couldn't parse the HTML. Check that it's a valid HTML document.",
  html_required: "No HTML provided.",
  html_too_large_5mb_max: "HTML file is too large. Maximum is 5MB.",
  newsletter_article_not_found: "Article not found. Try reloading the page.",
  newsletter_article_archived: "Cannot import to an archived article.",
  newsletter_article_id_required: "Missing article id. Try reloading the page.",
  invalid_json_body: "Invalid request format.",
  super_admin_required: "Only super-admins can import HTML.",
  file_read_failed: "Couldn't read the file. Try uploading again.",
  network_error: "Network error. Check your connection and try again.",
  invalid_response: "Got an unexpected response from the server.",
  cancelled: "Conversion cancelled.",
  internal_error: "Conversion failed. Try again or paste smaller HTML.",
  too_many_images_client_preflight: "Too many images in this article. Maximum 30 per import.",
  doc_generation_failed: "Couldn't convert the HTML into editor format. Try simplifying the source HTML.",
};

function friendlyError(code: string, message?: string): string {
  return ERROR_MESSAGES[code] ?? message ?? code;
}

function firstNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= n) return text.trim();
  return words.slice(0, n).join(" ") + "…";
}

function truncateDocByWords(doc: NewsletterTipTapDoc, maxWords: number): NewsletterTipTapDoc {
  // Best-effort: trim trailing top-level blocks once the cumulative plain-text
  // word count exceeds maxWords. Keeps the preview safe for any node mix.
  const content = ((doc as unknown as { content?: unknown[] }).content ?? []) as unknown[];
  const kept: unknown[] = [];
  let words = 0;
  for (const node of content) {
    const t = tipTapDocToPlainText({ type: "doc", content: [node] } as unknown as NewsletterTipTapDoc);
    const w = t.split(/\s+/).filter(Boolean).length;
    if (words + w > maxWords && kept.length > 0) break;
    kept.push(node);
    words += w;
    if (words >= maxWords) break;
  }
  return { type: "doc", content: kept } as unknown as NewsletterTipTapDoc;
}

/**
 * Rewrites every <img> in the parsed source DOM into a synthetic
 *   <figure data-newsletter-image="true" data-width="inline" data-asset-id=...>
 *     <img alt=... />
 *     <figcaption>…</figcaption>
 *   </figure>
 * shell so newsletterImage's parseHTML rule (`figure[data-newsletter-image]`)
 * matches during generateJSON.
 *
 * Behavior:
 * - Images already inside figure[data-newsletter-image] (round-trip) are left alone.
 * - Images inside a non-newsletter <figure> get the whole figure replaced; figcaption
 *   text content is preserved.
 * - Bare/other-parent images get just the <img> replaced.
 * - Successful images carry data-asset-id; failed images carry data-import-failed-src.
 *
 * Mutates parsedDoc in place.
 */
function rewriteImgsToSyntheticFigures(
  parsedDoc: Document,
  resolutions: Record<string, ImageResolution>,
): void {
  const allImgs = Array.from(parsedDoc.querySelectorAll("img"));
  for (const img of allImgs) {
    if (img.closest("figure[data-newsletter-image]")) continue;

    const src = img.getAttribute("src") || "";
    if (!src) continue;

    const alt = img.getAttribute("alt") || "";
    const resolution = resolutions[src];

    const enclosingFigure = img.closest("figure");
    let caption = "";
    if (enclosingFigure) {
      const figcaption = enclosingFigure.querySelector("figcaption");
      caption = figcaption?.textContent?.trim() || "";
    }

    const newFigure = parsedDoc.createElement("figure");
    newFigure.setAttribute("data-newsletter-image", "true");
    newFigure.setAttribute("data-width", "inline");

    if (resolution?.asset_id) {
      newFigure.setAttribute("data-asset-id", resolution.asset_id);
    } else {
      newFigure.setAttribute("data-import-failed-src", src);
    }

    const newImg = parsedDoc.createElement("img");
    if (alt) newImg.setAttribute("alt", alt);
    newFigure.appendChild(newImg);

    if (caption) {
      const newCaption = parsedDoc.createElement("figcaption");
      newCaption.textContent = caption;
      newFigure.appendChild(newCaption);
    }

    const target = enclosingFigure ?? img;
    target.parentNode?.replaceChild(newFigure, target);
  }
}

export default function ImportHtmlModal({
  articleId,
  open,
  onOpenChange,
  onImported,
  initialHtml,
}: ImportHtmlModalProps) {
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const closedDuringConvertRef = useRef(false);
  const initialHtmlConsumedRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setState({ phase: "idle" });
    setPasteOpen(false);
    setPasteValue("");
    setFailuresOpen(false);
    setDragOver(false);
    dragCounter.current = 0;
    closedDuringConvertRef.current = false;
  }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      reset();
    }
  }, [open, reset]);

  const handleClose = (next: boolean) => {
    if (!next && state.phase === "converting") {
      closedDuringConvertRef.current = true;
    }
    onOpenChange(next);
  };

  // ---------- File handling ----------
  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const okExt = name.endsWith(".html") || name.endsWith(".htm");
    const okMime = file.type === "text/html" || file.type === "" || file.type === "application/xhtml+xml";
    if (!okExt && !okMime) return "Only .html or .htm files are supported.";
    if (file.size > MAX_BYTES) return "File too large. Maximum is 5MB.";
    return null;
  };

  const startFromFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setState({ phase: "reading_file", filename: file.name });
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) {
        setState({ phase: "error", error: { code: "file_read_failed" } });
        return;
      }
      void runConversion(text);
    };
    reader.onerror = () => {
      setState({ phase: "error", error: { code: "file_read_failed" } });
    };
    reader.readAsText(file, "UTF-8");
  };

  // ---------- Conversion (client-side) ----------
  const runConversion = async (html: string) => {
    if (html.length > MAX_BYTES) {
      setState({ phase: "error", error: { code: "html_too_large_5mb_max" } });
      return;
    }

    setState({ phase: "converting", sizeBytes: html.length });

    // Step 1: parse HTML client-side
    let parsedDoc: Document;
    try {
      parsedDoc = new DOMParser().parseFromString(html, "text/html");
      if (!parsedDoc.body) throw new Error("no_body_element");
    } catch (e) {
      setState({
        phase: "error",
        error: { code: "html_parse_failed", message: (e as Error).message },
      });
      return;
    }

    // Step 2: collect <img> srcs, split data: vs network
    const imgEls = Array.from(parsedDoc.querySelectorAll("img"));
    const uniqueSrcs = new Set<string>();
    for (const img of imgEls) {
      const src = img.getAttribute("src");
      if (src) uniqueSrcs.add(src);
    }

    const networkSrcs: string[] = [];
    const dataUriSrcs: string[] = [];
    for (const src of uniqueSrcs) {
      if (src.startsWith("data:")) dataUriSrcs.push(src);
      else networkSrcs.push(src);
    }

    // Step 3: preflight (network only)
    if (networkSrcs.length > MAX_IMAGES_PER_IMPORT) {
      setState({
        phase: "error",
        error: {
          code: "too_many_images_client_preflight",
          message: `Article has ${networkSrcs.length} images; max ${MAX_IMAGES_PER_IMPORT} per import.`,
        },
      });
      return;
    }

    // Step 4: call import-html-images (only if network URIs exist)
    const resolutions: Record<string, ImageResolution> = {};
    let serverStats = { total_attempted: 0, succeeded: 0, failed: 0 };

    if (networkSrcs.length > 0) {
      setState({
        phase: "converting",
        sizeBytes: html.length,
        subLabel: `Fetching ${networkSrcs.length} image${networkSrcs.length === 1 ? "" : "s"}…`,
      });

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let resp: Response;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setState({ phase: "error", error: { code: "super_admin_required" } });
          return;
        }
        resp = await fetch(`${SUPABASE_URL}/functions/v1/import-html-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            image_urls: networkSrcs,
            newsletter_article_id: articleId,
          }),
          signal: ctrl.signal,
        });
      } catch (e: unknown) {
        if ((e as { name?: string })?.name === "AbortError") {
          if (!closedDuringConvertRef.current) reset();
          return;
        }
        setState({ phase: "error", error: { code: "network_error" } });
        return;
      } finally {
        if (abortRef.current === ctrl && !ctrl.signal.aborted) {
          abortRef.current = null;
        }
      }

      let respBody: unknown;
      try {
        respBody = await resp.json();
      } catch {
        setState({ phase: "error", error: { code: "invalid_response" } });
        return;
      }

      if (!resp.ok) {
        const errBody = respBody as { error?: string; message?: string };
        setState({
          phase: "error",
          error: { code: errBody?.error ?? "internal_error", message: errBody?.message },
        });
        return;
      }

      const imageResult = respBody as ImportImagesResponse;
      if (!imageResult?.resolutions) {
        setState({ phase: "error", error: { code: "invalid_response" } });
        return;
      }

      for (const [url, r] of Object.entries(imageResult.resolutions)) {
        resolutions[url] = r;
      }
      serverStats = imageResult.stats;
    }

    // Step 5: merge data-URI synthetic failures
    for (const src of dataUriSrcs) {
      resolutions[src] = {
        asset_id: null,
        failure: { kind: "scheme_rejected", detail: "data_uri" },
      };
    }

    // Step 6: rewrite <img> into synthetic figure shells
    rewriteImgsToSyntheticFigures(parsedDoc, resolutions);

    // Step 7: generateJSON
    let tiptapDoc: NewsletterTipTapDoc;
    try {
      const extensions = buildExtensions({ editable: false });
      tiptapDoc = generateJSON(
        parsedDoc.body.innerHTML,
        extensions,
      ) as unknown as NewsletterTipTapDoc;
    } catch (e) {
      setState({
        phase: "error",
        error: { code: "doc_generation_failed", message: (e as Error).message },
      });
      return;
    }

    // Step 8: build ConversionResponse
    const failuresList: ConversionFailure[] = [];
    for (const [url, r] of Object.entries(resolutions)) {
      if (r.failure) {
        failuresList.push({ ...r.failure, original_src: url });
      }
    }

    const totalAttempted = serverStats.total_attempted + dataUriSrcs.length;
    const totalFailed = serverStats.failed + dataUriSrcs.length;

    const result: ConversionResponse = {
      tiptap_doc: tiptapDoc,
      stats: {
        total_images_attempted: totalAttempted,
        images_succeeded: serverStats.succeeded,
        images_failed: totalFailed,
      },
      failures: failuresList,
    };

    const fullText = tipTapDocToPlainText(result.tiptap_doc);
    const previewText = firstNWords(fullText, 200);

    if (closedDuringConvertRef.current) return;

    setState({ phase: "success", result, previewText });
  };

  const onCancelConversion = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    reset();
  };

  // ---------- Drag handlers on the drop zone only ----------
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startFromFile(file);
  };

  // ---------- Render ----------
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import HTML</DialogTitle>
          <DialogDescription>
            Paste or upload an HTML article. Images will be fetched and uploaded; styling is stripped automatically.
          </DialogDescription>
        </DialogHeader>

        {state.phase === "idle" && (
          <IdleView
            dragOver={dragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onPickFile={() => fileInputRef.current?.click()}
            fileInputRef={fileInputRef}
            onFileSelected={(f) => startFromFile(f)}
            pasteOpen={pasteOpen}
            setPasteOpen={setPasteOpen}
            pasteValue={pasteValue}
            setPasteValue={setPasteValue}
            onConvertPaste={() => runConversion(pasteValue)}
          />
        )}

        {state.phase === "reading_file" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--bw-orange,#F5741A)]" />
            <div className="text-sm">Reading {state.filename}…</div>
          </div>
        )}

        {state.phase === "converting" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bw-orange,#F5741A)]" />
            <div className="text-base font-medium text-slate-800">Converting HTML…</div>
            {state.subLabel && (
              <div className="text-xs text-slate-500">{state.subLabel}</div>
            )}
            <div className="w-full max-w-md">
              <Progress value={undefined as unknown as number} className="h-1.5" />
            </div>
            <div className="text-xs text-slate-500 text-center max-w-md">
              This can take up to 2 minutes if the article has many images. Fetching and uploading images runs server-side.
            </div>
            <Button variant="outline" size="sm" onClick={onCancelConversion}>
              Cancel
            </Button>
          </div>
        )}

        {state.phase === "success" && (
          <SuccessView
            result={state.result}
            previewText={state.previewText}
            failuresOpen={failuresOpen}
            setFailuresOpen={setFailuresOpen}
            onCancel={() => onOpenChange(false)}
            onConfirm={() => {
              onImported(state.result.tiptap_doc);
              onOpenChange(false);
            }}
          />
        )}

        {state.phase === "error" && (
          <div className="flex flex-col gap-4 py-6">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900">Import failed</div>
                <div className="mt-1 text-sm text-red-800">
                  {friendlyError(state.error.code, state.error.message)}
                </div>
                <div className="mt-2 text-[11px] font-mono text-red-700/70">
                  code: {state.error.code}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setState({ phase: "idle" })}>Try again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Sub-views ----------

function IdleView(props: {
  dragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPickFile: () => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFileSelected: (f: File) => void;
  pasteOpen: boolean;
  setPasteOpen: (v: boolean) => void;
  pasteValue: string;
  setPasteValue: (v: string) => void;
  onConvertPaste: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={props.onPickFile}
        onDragEnter={props.onDragEnter}
        onDragLeave={props.onDragLeave}
        onDragOver={props.onDragOver}
        onDrop={props.onDrop}
        className={cn(
          "w-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors px-6 py-8 text-center",
          "bg-[var(--bw-cream-100,#FBF6EE)] border-[var(--bw-orange,#F5741A)]/40 hover:border-[var(--bw-orange,#F5741A)]/80 hover:bg-[var(--bw-cream-200,#F6EEDC)]",
          props.dragOver && "border-[var(--bw-orange,#F5741A)] bg-[var(--bw-cream-200,#F6EEDC)]",
        )}
      >
        <FileUp className="h-10 w-10 text-slate-400" />
        <div className="text-sm font-medium text-slate-800">
          Drop an HTML file here, or click to browse
        </div>
        <div className="text-xs text-slate-500">.html or .htm, up to 5MB</div>
        <input
          ref={props.fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onFileSelected(f);
            e.target.value = "";
          }}
        />
      </button>

      <div>
        <button
          type="button"
          onClick={() => props.setPasteOpen(!props.pasteOpen)}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          {props.pasteOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Or paste HTML directly
        </button>
        {props.pasteOpen && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={props.pasteValue}
              onChange={(e) => props.setPasteValue(e.target.value)}
              placeholder="<html>…</html>"
              className="min-h-[200px] font-mono text-[13px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={props.onConvertPaste}
                disabled={!props.pasteValue.trim()}
                className="bg-[var(--bw-orange,#F5741A)] hover:bg-[var(--bw-orange,#F5741A)]/90 text-white"
              >
                Convert paste
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white px-3 py-2",
        tone === "warn" ? "border-amber-200" : "border-slate-200",
      )}
    >
      <div
        className={cn(
          "text-2xl font-semibold",
          tone === "warn" ? "text-amber-700" : "text-slate-900",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function SuccessView({
  result,
  previewText,
  failuresOpen,
  setFailuresOpen,
  onCancel,
  onConfirm,
}: {
  result: ConversionResponse;
  previewText: string;
  failuresOpen: boolean;
  setFailuresOpen: (v: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const previewDoc = useMemo(
    () => truncateDocByWords(result.tiptap_doc, 200),
    [result.tiptap_doc],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium text-emerald-900">Conversion complete</div>
          <div className="mt-0.5 text-xs text-emerald-800">
            Review the preview below before importing.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Images attempted" value={result.stats.total_images_attempted} />
        <StatCard label="Images succeeded" value={result.stats.images_succeeded} />
        <StatCard
          label="Images failed"
          value={result.stats.images_failed}
          tone={result.stats.images_failed > 0 ? "warn" : "ok"}
        />
      </div>

      {result.failures.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-amber-900">
              {result.failures.length} non-fatal issue{result.failures.length === 1 ? "" : "s"}. Imported content includes placeholders for failed items.
            </div>
            <button
              type="button"
              onClick={() => setFailuresOpen(!failuresOpen)}
              className="text-xs font-medium text-amber-900 hover:underline"
            >
              {failuresOpen ? "Hide" : "Show"} details
            </button>
          </div>
          {failuresOpen && (
            <div className="mt-3 max-h-[180px] overflow-y-auto rounded border border-amber-200 bg-white p-2 space-y-1 font-mono text-[11px] leading-snug text-slate-800">
              {result.failures.map((f, i) => (
                <div key={i} className="border-b border-slate-100 pb-1 last:border-0">
                  <span className="font-semibold text-amber-800">{f.kind}</span>
                  <span> — {f.detail}</span>
                  {f.original_src && (
                    <div className="text-slate-500 truncate">src: {f.original_src}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Preview</div>
        <div className="rounded-md border border-slate-200 bg-white p-4 max-h-[300px] overflow-y-auto">
          <PreviewRenderer doc={previewDoc} fallbackText={previewText} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-[var(--bw-orange,#F5741A)] hover:bg-[var(--bw-orange,#F5741A)]/90 text-white"
        >
          Import into editor (replaces current draft body)
        </Button>
      </div>
    </div>
  );
}

function PreviewRenderer({
  doc,
  fallbackText,
}: {
  doc: NewsletterTipTapDoc;
  fallbackText: string;
}) {
  const extensions = useMemo(() => {
    const base = buildExtensions({ editable: false });
    return base.map((ext) => {
      if (ext.name === NewsletterImage.name) {
        return ext.extend({ addNodeView: () => ReactNodeViewRenderer(ImageReaderNodeView) });
      }
      if (ext.name === NewsletterEmbed.name) {
        return ext.extend({ addNodeView: () => ReactNodeViewRenderer(EmbedReaderNodeView) });
      }
      return ext;
    });
  }, []);

  const editor = useEditor(
    {
      extensions,
      content: doc,
      editable: false,
    },
    [doc],
  );

  if (!editor) {
    return <div className="text-sm text-slate-500 italic">{fallbackText}</div>;
  }

  return (
    <div className="newsletter-prose">
      <EditorContent editor={editor} />
    </div>
  );
}
