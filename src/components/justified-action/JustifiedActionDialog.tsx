import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export interface JustifiedActionResult {
  changed: boolean;
  note?: string;
}

export interface JustifiedActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Visual identity */
  title: string;
  description?: React.ReactNode;

  /**
   * Caller-owned mutation. Receives the validated (trimmed, length>=10) reason.
   * Should throw on RPC failure; the dialog catches and routes the raw
   * message through defaultMapError, then the caller's mapError, then raw.
   */
  onSubmit: (reason: string) => Promise<JustifiedActionResult>;

  /** Optional caller-specific error mapper. Runs after the built-in one. */
  mapError?: (rawMessage: string) => string | null;

  /** Toast title when result.changed === true. */
  successTitle: string;
  /** Toast title when result.changed === false. Defaults to "No change made". */
  noopTitle?: string;
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string;
}

function defaultMapError(raw: string): string | null {
  if (raw.includes("reason_required_min_chars")) {
    return "Justification must be at least 10 characters.";
  }
  if (raw.includes("authentication_required")) {
    return "You're not authorized to perform this action.";
  }
  if (raw.includes("target_user_not_found")) {
    return "The target user no longer exists.";
  }
  return null;
}

export default function JustifiedActionDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  mapError,
  successTitle,
  noopTitle,
  confirmLabel,
}: JustifiedActionDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
      setErrorMessage(null);
    }
  }, [open]);

  const trimmedLen = reason.trim().length;
  const canConfirm = trimmedLen >= 10 && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (submitting && !next) return;
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await onSubmit(reason.trim());
      if (result.changed) {
        toast({ title: successTitle, description: result.note });
      } else {
        toast({
          title: noopTitle ?? "No change made",
          description: result.note ?? "No change was needed.",
        });
      }
      onOpenChange(false);
    } catch (err) {
      const raw = (err as Error)?.message ?? "Unknown error";
      const fromDefault = defaultMapError(raw);
      const fromCaller = !fromDefault ? mapError?.(raw) ?? null : null;
      setErrorMessage(fromDefault ?? fromCaller ?? raw);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription asChild>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="justified-action-reason">Justification reason</Label>
          <Textarea
            id="justified-action-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="At least 10 characters explaining why…"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            {trimmedLen}/10 minimum characters
          </p>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
