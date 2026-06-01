import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DispatchEngagementStats } from "./DispatchEngagementStats";

interface Props {
  articleId: string | null;
}

interface DispatchRow {
  id: string;
  trigger_type: string;
  status: string;
  recipient_count: number | null;
  sent_count: number | null;
  failed_count: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  sending: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  partial: "bg-amber-50 text-amber-800 border-amber-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
};

export function DispatchHistoryPanel({ articleId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["newsletter-dispatches", articleId],
    enabled: !!articleId,
    queryFn: async () => {
      if (!articleId) return [];
      const { data, error } = await supabase
        .from("newsletter_dispatches")
        .select("id, trigger_type, status, recipient_count, sent_count, failed_count, error_message, started_at, completed_at, created_at")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DispatchRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Dispatch history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!articleId ? (
          <p className="text-xs text-slate-400">Save the draft first.</p>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Inbox className="h-6 w-6 text-slate-300" />
            <p className="text-xs text-slate-500">No dispatches yet.</p>
          </div>
        ) : (
          data.map((d) => {
            const isOpen = expanded === d.id;
            const ts = d.completed_at ?? d.started_at ?? d.created_at;
            return (
              <div key={d.id} className="rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <Badge variant="outline" className={cn("capitalize font-medium text-xs", STATUS_BADGE[d.status] ?? "bg-slate-100 text-slate-700")}>
                    {d.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-slate-200 bg-white text-slate-600 font-normal capitalize">
                    {d.trigger_type}
                  </Badge>
                  <span className="text-xs text-slate-600 ml-1">
                    {d.sent_count ?? 0}/{d.recipient_count ?? 0} sent
                    {d.failed_count ? <span className="text-rose-600"> · {d.failed_count} failed</span> : null}
                  </span>
                  <span className="ml-auto text-xs text-slate-400" title={ts ? format(new Date(ts), "PPpp") : ""}>
                    {ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "—"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 border-t border-slate-100">
                    {d.error_message && (
                      <p className="text-xs text-rose-600 pt-2">{d.error_message}</p>
                    )}
                    <DispatchEngagementStats dispatchId={d.id} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
