import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pencil, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptPath: string | null;
  onEdit?: () => void;
};

export default function ReceiptViewerDialog({ open, onOpenChange, receiptPath, onEdit }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isPdf = (receiptPath ?? "").toLowerCase().endsWith(".pdf");

  // 1. Resolve a signed URL for the private receipt.
  useEffect(() => {
    if (!open || !receiptPath) {
      setSignedUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: sErr } = await opsSupabase.storage
        .from("operations-receipts")
        .createSignedUrl(receiptPath, 600);
      if (cancelled) return;
      if (sErr || !data?.signedUrl) {
        setLoading(false);
        setError("Could not load receipt.");
        toast.error("Could not load receipt");
        return;
      }
      setSignedUrl(data.signedUrl);
      if (!isPdf) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, receiptPath, isPdf]);

  // 2. For PDFs: fetch bytes and render every page to a canvas with PDF.js.
  useEffect(() => {
    if (!open || !isPdf || !signedUrl) return;
    let cancelled = false;
    let pdfDoc: any = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch(signedUrl);
        if (!resp.ok) throw new Error("fetch failed");
        const buf = await resp.arrayBuffer();
        if (cancelled) return;

        pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const dpr = window.devicePixelRatio || 1;
        const containerWidth = container.clientWidth || 800;

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const cssScale = Math.min(2, Math.max(0.4, (containerWidth - 24) / base.width));
          const viewport = page.getViewport({ scale: cssScale * dpr });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.className = "mx-auto mb-4 rounded bg-white shadow-sm";
          container.appendChild(canvas);

          await page.render({ canvasContext: ctx, viewport } as any).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError("Could not render this receipt. Use \u201COpen in new tab\u201D to view it.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch {
          /* noop */
        }
      }
    };
  }, [open, isPdf, signedUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 overflow-auto rounded border bg-muted/30 p-3 min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive text-center px-4">
              {error}
            </div>
          ) : isPdf ? (
            <div ref={containerRef} className="w-full" />
          ) : signedUrl ? (
            <div className="flex items-center justify-center">
              <img
                src={signedUrl}
                alt="Receipt"
                className="max-w-full h-auto rounded shadow-sm"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError("Could not load receipt image.");
                }}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
          <div>
            {signedUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Open in new tab
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button type="button" variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Edit expense
              </Button>
            )}
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
