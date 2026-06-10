import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CoachRow {
  coach_user_id: string;
  coach_name: string | null;
  coach_email: string | null;
  is_shared: boolean;
}

export function ShareWithCoachDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-coaches"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dp_list_my_coaches" as never);
      if (error) throw error;
      return data as { coaches: CoachRow[] };
    },
  });

  const coaches = (data?.coaches ?? []) as CoachRow[];

  const toggleShare = async (coachId: string, enabled: boolean) => {
    setBusy(coachId);
    const { error } = await supabase.rpc(
      "dp_set_coach_share" as never,
      { p_coach_user_id: coachId, p_enabled: enabled } as never
    );
    setBusy(null);
    if (error) {
      toast.error(enabled ? "Could not share with this coach." : "Could not stop sharing.");
      return;
    }
    toast.success(enabled ? "Shared with your coach" : "Stopped sharing");
    queryClient.invalidateQueries({ queryKey: ["my-coaches"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="h-4 w-4 mr-1.5" /> Share with coach
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your development plan</DialogTitle>
          <DialogDescription>
            Coaches you share with can see your plan and add comments. They can't edit your
            actions or entries, and you can stop sharing at any time.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : coaches.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            You don't have a coach yet. When a coach adds you as a client, they'll appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {coaches.map((c) => (
              <div key={c.coach_user_id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.coach_name ?? "Coach"}</p>
                  {c.coach_email && <p className="text-xs text-muted-foreground truncate">{c.coach_email}</p>}
                </div>
                <Switch
                  checked={c.is_shared}
                  disabled={busy === c.coach_user_id}
                  onCheckedChange={(v) => toggleShare(c.coach_user_id, v)}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
