import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  dispatchId: string;
}

interface EmailLogRow {
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
}

export function DispatchEngagementStats({ dispatchId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dispatch-engagement", dispatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("delivered_at, opened_at, clicked_at, bounced_at")
        .eq("dispatch_id", dispatchId)
        .eq("email_type", "newsletter");
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }
  if (error) {
    return <p className="text-xs text-destructive pt-2">Failed to load engagement: {(error as Error).message}</p>;
  }

  const rows = data ?? [];
  const delivered = rows.filter(r => r.delivered_at).length;
  const opened = rows.filter(r => r.opened_at).length;
  const clicked = rows.filter(r => r.clicked_at).length;
  const bounced = rows.filter(r => r.bounced_at).length;

  const stat = (label: string, value: number) => (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-4 gap-2 pt-2">
      {stat("Delivered", delivered)}
      {stat("Opened", opened)}
      {stat("Clicked", clicked)}
      {stat("Bounced", bounced)}
    </div>
  );
}
