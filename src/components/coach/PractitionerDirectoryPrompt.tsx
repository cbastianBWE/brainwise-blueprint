import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { pdMissingLabel, type PdState } from "@/lib/practitionerDirectory";

const SESSION_KEY = "pd_prompt_dismissed";

export function PractitionerDirectoryPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { data: state, isLoading, error } = useQuery({
    queryKey: ["directory-state", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("pd_get_my_directory_state");
      if (error) throw error;
      return (data ?? null) as PdState | null;
    },
  });

  const close = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (!user || dismissed || isLoading || error || !state?.needs_completion) return null;

  const missing = (state.missing_fields ?? []).map(pdMissingLabel);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish your directory profile</DialogTitle>
          <DialogDescription>
            You are listed in the BrainWise practitioner directory, but your profile is not finished yet. It will not
            appear in the directory until it is complete and approved.
          </DialogDescription>
        </DialogHeader>
        {missing.length > 0 && (
          <div className="text-sm text-foreground">
            <p className="mb-1">Still needed:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>Later</Button>
          <Button onClick={() => { close(); navigate("/coach/profile"); }}>Complete now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PractitionerDirectoryPrompt;
