import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItemId: string;
  lessonTitle: string;
  isDirty: boolean;
}

const REPORTING_OPTIONS: { value: string; label: string }[] = [
  { value: "passed_incomplete", label: "Passed / Incomplete" },
  { value: "passed_failed", label: "Passed / Failed" },
  { value: "completed_incomplete", label: "Completed / Incomplete" },
  { value: "completed_failed", label: "Completed / Failed" },
];

interface ExportResult {
  signed_download_url: string;
  bytes: number;
  blocks: number;
  assets: number;
}

export function ScormExportPanel({ open, onOpenChange, contentItemId, lessonTitle, isDirty }: Props) {
  const { toast } = useToast();
  const [reportingPair, setReportingPair] = useState("passed_incomplete");
  const [completionPct, setCompletionPct] = useState(100);
  const [exitLink, setExitLink] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setGenerating(false);
    }
  }, [open]);

  if (!open) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    const pct = Math.max(1, Math.min(100, Math.floor(completionPct || 100)));
    try {
      const { data, error: fnError } = await supabase.functions.invoke("scorm-export", {
        body: {
          content_item_id: contentItemId,
          scorm_version: "2004_4th",
          tracking_mode: "course_completion",
          reporting_pair: reportingPair,
          completion_pct: pct,
          exit_link: exitLink,
        },
      });
      if (fnError) {
        let msg = fnError.message || "Export failed";
        try {
          const ctx = await (fnError as any).context?.json?.();
          if (ctx?.error) msg = ctx.error;
          if (ctx?.message) msg = ctx.message;
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      if (data?.signed_download_url) {
        setResult(data as ExportResult);
        toast({ title: "SCORM package ready" });
      } else {
        setError("Unexpected response from the export service.");
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setGenerating(false);
    }
  };

  const prettyBytes = (n: number) => {
    if (!n) return "";
    const mb = n / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(n / 1024))} KB`;
  };

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
            <div className="text-base font-semibold">Export to SCORM</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Package "{lessonTitle}" as a SCORM course to upload into another LMS.
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {isDirty && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              You have unsaved changes on the canvas. The export uses the last{" "}
              saved version of this lesson. Save first to include your latest edits.
            </div>
          )}

          <div className="space-y-2">
            <Label>SCORM version</Label>
            <Select value="2004_4th" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2004_4th">SCORM 2004 (4th Edition)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">SCORM 1.2 export is coming next.</p>
          </div>

          <div className="space-y-2">
            <Label>LMS reporting</Label>
            <Select value={reportingPair} onValueChange={setReportingPair}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORTING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Status reported to the LMS when the learner finishes versus does not.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mark complete at</Label>
            <div className="flex items-center gap-2 text-sm">
              <Input
                type="number"
                min={1}
                max={100}
                value={completionPct}
                onChange={(e) => setCompletionPct(Number(e.target.value))}
                className="w-24"
              />
              <span>% of the lesson scrolled</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Exit course link</Label>
              <p className="text-xs text-muted-foreground">Show an Exit button at the end.</p>
            </div>
            <Switch checked={exitLink} onCheckedChange={setExitLink} />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div>
                Package ready: {result.blocks} blocks
                {result.assets ? `, ${result.assets} asset${result.assets === 1 ? "" : "s"}` : ""}
                {result.bytes ? ` · ${prettyBytes(result.bytes)}` : ""}.
              </div>
              <Button asChild size="sm">
                <a href={result.signed_download_url} target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-4 w-4" /> Download .zip
                </a>
              </Button>
              <p className="text-[11px] text-emerald-800/80">Download link expires in 1 hour.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t p-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={generating}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : result ? (
              "Regenerate"
            ) : (
              "Generate package"
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

export default ScormExportPanel;
