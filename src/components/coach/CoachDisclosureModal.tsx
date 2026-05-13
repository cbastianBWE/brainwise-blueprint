import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  versionId: string;
  versionHash: string;
  bodyMarkdown: string;
  effectiveFrom?: string;
  onAccepted: () => void;
}

export function CoachDisclosureModal({
  versionId,
  versionHash,
  bodyMarkdown,
  effectiveFrom,
  onAccepted,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("accept_coach_disclosure", {
      p_version_id: versionId,
      p_version_hash: versionHash,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not record acceptance", description: error.message, variant: "destructive" });
      return;
    }
    const result = (data ?? {}) as { error?: string; ok?: boolean };
    if (result.error) {
      if (result.error === "version_mismatch") {
        toast({
          title: "Disclosure updated",
          description: "The disclosure has been updated. Reloading...",
          variant: "destructive",
        });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      toast({ title: "Could not record acceptance", description: result.error, variant: "destructive" });
      return;
    }
    onAccepted();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-auto"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.preventDefault();
      }}
    >
      <div className="bg-background rounded-lg shadow-xl max-w-3xl w-full my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground">Coach Confidentiality Obligations</h2>
          {effectiveFrom && (
            <p className="text-xs text-muted-foreground mt-1">
              Effective from {new Date(effectiveFrom).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="prose prose-sm sm:prose-base max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground">
            <ReactMarkdown>{bodyMarkdown}</ReactMarkdown>
          </div>
        </div>
        <div className="p-6 border-t space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-1"
            />
            <span className="text-sm text-foreground">
              I have read and understood these coach confidentiality obligations. I agree to
              comply with them in my use of the BrainWise platform.
            </span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={handleLogout} disabled={submitting}>
              Log Out
            </Button>
            <Button onClick={handleAccept} disabled={!agreed || submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
