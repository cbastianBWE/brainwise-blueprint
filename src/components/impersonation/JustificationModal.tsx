import { useEffect, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import MfaChallenge from "@/components/MfaChallenge";
import { useImpersonation } from "@/contexts/ImpersonationProvider";
import { useAuth } from "@/hooks/useAuth";

interface JustificationModalProps {
  target: {
    user_id: string;
    email: string;
    full_name: string | null;
    account_type: string;
  } | null;
  onClose: () => void;
}

const JustificationModal = ({ target, onClose }: JustificationModalProps) => {
  const { beginImpersonation } = useImpersonation();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [justification, setJustification] = useState("");
  const [mode, setMode] = useState<"observe" | "act">("observe");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target === null) {
      setStep(1);
      setJustification("");
      setMode("observe");
      setSubmitting(false);
    }
  }, [target]);

  const handleMfaSuccess = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      await beginImpersonation(target.user_id, mode, justification.trim());
    } catch (err: any) {
      setSubmitting(false);
      const message = err?.message || "Could not start impersonation";
      if (message.includes("MFA_REQUIRED")) {
        toast.error("Fresh MFA verification required. Please try again.");
        setStep(1);
      } else if (message.includes("NESTED_IMPERSONATION")) {
        toast.error("You already have an active impersonation session. End it first.");
        onClose();
      } else if (message.includes("SELF_IMPERSONATION")) {
        toast.error("You cannot impersonate yourself.");
        onClose();
      } else if (message.includes("TARGET_NOT_FOUND")) {
        toast.error("Target user not found.");
        onClose();
      } else {
        toast.error(message);
      }
    }
  };

  if (!target) return null;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Impersonate User</DialogTitle>
              <DialogDescription>
                You are about to impersonate {target.email}
                {target.full_name ? ` (${target.full_name})` : ""}. This action will be audited.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="justification">Justification (required)</Label>
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters. Recorded in the audit log alongside this session.
                </p>
                <Textarea
                  id="justification"
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g. Investigating customer report of dashboard rendering issue (ticket #1234)"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {justification.length} / 10 minimum
                </p>
              </div>
              <div className="space-y-2">
                <Label>Mode (required)</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as "observe" | "act")}>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="observe" id="mode-observe" className="mt-1" />
                    <div>
                      <Label htmlFor="mode-observe" className="font-medium">Observe (read-only)</Label>
                      <p className="text-xs text-muted-foreground">View as the user. All mutations are blocked.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="act" id="mode-act" className="mt-1" />
                    <div>
                      <Label htmlFor="mode-act" className="font-medium">Act (permitted writes)</Label>
                      <p className="text-xs text-muted-foreground">
                        Limited writes allowed. Identity, demographics, financial, and other sensitive operations remain blocked.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={justification.trim().length < 10}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Verify your identity</DialogTitle>
              <DialogDescription>
                Confirm with your authenticator to start the impersonation session.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              {submitting ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Starting impersonation...</p>
                </div>
              ) : user ? (
                <MfaChallenge
                  userId={user.id}
                  onSuccess={handleMfaSuccess}
                  onCancel={() => setStep(1)}
                />
              ) : null}
            </div>
            {!submitting && (
              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back to justification
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JustificationModal;
