import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload as UploadIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
import {
  type Step,
  type Session,
  type Responses,
  type AssessmentFileType,
  type AssessmentUploadRow,
  buildUserPatch,
  inferFileType,
  extForFile,
} from "../shared";

const ACCEPT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  image: "image/png,image/jpeg,image/webp,image/gif",
  docx: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_COUNT = 8;

export function AssessmentUploadWidget({
  step,
  session,
  userId,
  responses,
  setResponses,
  setCoachingRemaining,
}: {
  step: Step;
  session: Session;
  userId: string;
  responses: Responses;
  setResponses: (updater: (prev: Responses) => Responses) => void;
  setCoachingRemaining: (n: number) => void;
}) {
  const accept = step.accept ?? ["pdf", "image", "docx"];
  const bucket = step.bucket ?? "coaching-user-uploads";
  const uploadsTable = (step.uploadsTable ?? "coaching_assessment_uploads") as "coaching_assessment_uploads";
  const analysisKey = step.analysisKey ?? "assessment_analysis";
  const suggestions = step.suggestions ?? [];
  const analyzeFn = step.mapAction?.function ?? "coaching-assessment-analyze";
  const analyzeLabel = step.mapAction?.label ?? "Analyze against my PTP";

  const [rows, setRows] = useState<AssessmentUploadRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const analysis = (responses as any)[analysisKey] as { html?: string } | undefined;
  const analysisSignatureRef = useRef<string>("");
  const currentSignature = rows.map((r) => r.id).sort().join("|");
  const analysisStale =
    !!analysis?.html && analysisSignatureRef.current !== "" && analysisSignatureRef.current !== currentSignature;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRows(true);
      const { data } = await supabase
        .from(uploadsTable)
        .select("id,label,file_type,original_filename,storage_path")
        .eq("coaching_session_id", session.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const list = (data || []) as AssessmentUploadRow[];
      setRows(list);
      if (analysis?.html && !analysisSignatureRef.current) {
        analysisSignatureRef.current = list.map((r) => r.id).sort().join("|");
      }
      setLoadingRows(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, uploadsTable]);

  const onPick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    if (rows.length + arr.length > MAX_UPLOAD_COUNT) {
      toast.error(`You can upload up to ${MAX_UPLOAD_COUNT} files.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of arr) {
        const ftype = inferFileType(file, accept);
        if (!ftype) {
          toast.error(`"${file.name}" isn't a supported file type.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`"${file.name}" is larger than 10 MB.`);
          continue;
        }
        const id = crypto.randomUUID();
        const ext = extForFile(file, ftype);
        const path = `${userId}/assessments/${session.id}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (upErr) {
          toast.error(`Upload failed for "${file.name}".`);
          continue;
        }
        const label = (pendingLabel.trim() || file.name).slice(0, 200);
        const { data: inserted, error: insErr } = await supabase
          .from(uploadsTable)
          .insert({
            user_id: userId,
            coaching_session_id: session.id,
            storage_path: path,
            label,
            file_type: ftype,
            original_filename: file.name,
          })
          .select("id,label,file_type,original_filename,storage_path")
          .single();
        if (insErr || !inserted) {
          toast.error(`Couldn't save "${file.name}".`);
          await supabase.storage.from(bucket).remove([path]);
          continue;
        }
        setRows((prev) => [...prev, inserted as AssessmentUploadRow]);
        setPendingLabel("");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeRow = async (row: AssessmentUploadRow) => {
    await supabase.storage.from(bucket).remove([row.storage_path]).catch(() => {});
    const { error } = await supabase.from(uploadsTable).delete().eq("id", row.id);
    if (error) {
      toast.error("Couldn't remove that file.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const runAnalyze = async () => {
    if (rows.length === 0) return;
    setAnalyzing(true);
    try {
      await supabase.rpc("coaching_session_save", {
        p_session_id: session.id,
        p_current_step: session.current_step,
        p_patch: buildUserPatch(responses) as any,
      });
      const { data, error } = await supabase.functions.invoke(analyzeFn, {
        body: { session_id: session.id },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else if (status === 403) {
          toast.error("Access denied for this activity.");
        } else {
          toast.error("Analysis failed. Please try again.");
        }
        return;
      }
      const html =
        (data as any)?.assessment_analysis_html ??
        (data as any)?.analysis_html ??
        "";
      const remaining = (data as any)?.coaching_remaining;
      if (typeof remaining === "number") setCoachingRemaining(remaining);
      setResponses((r) => ({
        ...r,
        [analysisKey]: { ...((r as any)[analysisKey] || {}), html },
      }));
      analysisSignatureRef.current = rows.map((r) => r.id).sort().join("|");
    } finally {
      setAnalyzing(false);
    }
  };

  const iconFor = (t: AssessmentFileType) => {
    if (t === "image") return "🖼️";
    if (t === "pdf") return "📄";
    return "📝";
  };

  const acceptAttr = accept.map((k) => ACCEPT_MIME[k]).filter(Boolean).join(",");

  return (
    <div className="space-y-4">
      {step.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.body}</p>
      )}
      <p className="text-xs text-muted-foreground">This step is optional — you can skip it.</p>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Other people upload things like…
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => setPendingLabel(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="asmnt-label" className="text-xs">
              Label (optional)
            </Label>
            <Input
              id="asmnt-label"
              placeholder="e.g. DiSC, EQ 2.0…"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
            />
          </div>
          <Button
            onClick={onPick}
            disabled={uploading || rows.length >= MAX_UPLOAD_COUNT}
            variant="outline"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4" />
                Add file
              </>
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept={acceptAttr}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          PDF, image, or Word (.docx). Up to 10 MB each, {MAX_UPLOAD_COUNT} files max.
        </p>
      </div>

      {loadingRows ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your files…
        </div>
      ) : rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-lg" aria-hidden>{iconFor(r.file_type)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.original_filename}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(r)}
                aria-label="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={runAnalyze}
          disabled={rows.length === 0 || analyzing}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : analysis?.html ? (
            <>
              <RotateCcw className="h-4 w-4" />
              Re-analyze
            </>
          ) : (
            analyzeLabel
          )}
        </Button>
        {rows.length > 0 && !analysis?.html && (
          <p className="text-xs text-muted-foreground">
            Tip: analyze before you continue so your plan can use these.
          </p>
        )}
        {analysisStale && (
          <p className="text-xs text-muted-foreground">
            Your files changed — re-analyze to refresh.
          </p>
        )}
      </div>

      {analysis?.html && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            How this lines up with your PTP
          </h3>
          <AiAnalysisPanel html={analysis.html} />
        </div>
      )}
    </div>
  );
}
