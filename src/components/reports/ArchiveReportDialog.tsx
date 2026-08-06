import { useEffect, useState } from "react";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export type ReportKind = "team" | "paired";

export const MIN_REASON = 10;


export function formatArchiveDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

/** Muted "Archived" badge with the reason and date in a tooltip. */
export function ArchivedBadge({
  archivedAt,
  reason,
}: {
  archivedAt: string | null | undefined;
  reason: string | null | undefined;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            <Archive className="h-3 w-3 mr-1" />
            Archived
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            Archived {formatArchiveDate(archivedAt)}
            {reason ? `: ${reason}` : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ReportKind;
  reportId: string;
  /** Names of the subjects, so the user can see which row they clicked. */
  subjects: string;
  /** Display date of the report. */
  dateLabel?: string;
  onArchived?: () => void;
}

export function ArchiveReportDialog({
  open,
  onOpenChange,
  kind,
  reportId,
  subjects,
  dateLabel,
  onArchived,
}: DialogProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const tooShort = reason.trim().length < MIN_REASON;

  const confirm = async () => {
    setTouched(true);
    if (tooShort) return;
    setBusy(true);
    const { error } = await supabase.rpc("bw_archive_report", {
      p_kind: kind,
      p_id: reportId,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Couldn't archive this report.");
      return;
    }
    toast.success("Report archived.");
    onOpenChange(false);
    onArchived?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Archive this {kind === "team" ? "team" : "paired"} report?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="font-medium text-foreground">{subjects || "This report"}</div>
                {dateLabel && <div className="text-muted-foreground">{dateLabel}</div>}
              </div>
              <p>
                Archiving removes this report from everyone&apos;s list. Nothing is deleted: the
                report, its sections and its highlights all stay, and a super admin can restore it.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="archive-reason">Reason for archiving</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Why is this report being archived? This is what a future reader sees."
            rows={3}
            maxLength={500}
          />
          <p className={`text-xs ${touched && tooShort ? "text-destructive" : "text-muted-foreground"}`}>
            {touched && tooShort
              ? `Please give a reason of at least ${MIN_REASON} characters. This is what a future reader sees.`
              : `At least ${MIN_REASON} characters. This is what a future reader sees.`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
            disabled={busy || tooShort}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Super admin only restore control. */
export function RestoreReportButton({
  kind,
  reportId,
  onRestored,
}: {
  kind: ReportKind;
  reportId: string;
  onRestored?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    const { error } = await rpc("bw_restore_report", { p_kind: kind, p_id: reportId });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Couldn't restore this report.");
      return;
    }
    toast.success("Report restored.");
    onRestored?.();
  };
  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={restore}>
      {busy ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4 mr-1" />
      )}
      Restore
    </Button>
  );
}

/**
 * Resolves whether the current viewer may archive a given report, using the
 * can_archive flag that bw_list_my_reports already returns.
 */
export function useCanArchiveReport(kind: ReportKind, reportId: string | undefined) {
  const [canArchive, setCanArchive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!reportId) return;
    void (async () => {
      const { data, error } = await supabase.rpc("bw_list_my_reports");
      if (cancelled || error) return;
      const rows = (data as Array<{ report_id: string; kind: string; can_archive?: boolean }>) ?? [];
      const row = rows.find((r) => r.report_id === reportId && r.kind === kind);
      setCanArchive(row?.can_archive === true);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, reportId]);
  return canArchive;
}
