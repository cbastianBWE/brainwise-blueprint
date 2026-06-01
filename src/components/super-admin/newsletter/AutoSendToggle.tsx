import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsRow {
  dispatch_trigger_mode: "manual" | "automatic";
}

export function AutoSendToggle() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["newsletter-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_settings")
        .select("dispatch_trigger_mode")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { dispatch_trigger_mode: "manual" }) as SettingsRow;
    },
  });

  const mode = data?.dispatch_trigger_mode ?? "manual";
  const isAuto = mode === "automatic";

  const onToggle = async (checked: boolean) => {
    const next = checked ? "automatic" : "manual";
    const { error } = await supabase
      .from("newsletter_settings")
      .update({ dispatch_trigger_mode: next })
      .eq("id", true);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }
    toast.success(`Auto-send on publish: ${checked ? "On" : "Off"}`);
    queryClient.invalidateQueries({ queryKey: ["newsletter-settings"] });
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-56" />;
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <Switch id="auto-send" checked={isAuto} onCheckedChange={onToggle} />
      <div className="flex flex-col">
        <Label htmlFor="auto-send" className="text-sm font-medium cursor-pointer">
          Auto-send on publish: {isAuto ? "On" : "Off"}
        </Label>
        <span className="text-[10px] text-slate-400 leading-tight">
          Stores the preference only — automatic dispatch is not yet wired.
        </span>
      </div>
    </div>
  );
}
