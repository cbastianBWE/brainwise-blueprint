import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  contentItemId: string;
  traineeId: string;
  onActionComplete: () => void;
}

type Status = "registered" | "attended" | "missed";

const OPTIONS: { value: Status; label: string }[] = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "missed", label: "Missed" },
];

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function LiveEventReviewPanel({ contentItemId, traineeId, onActionComplete }: Props) {
  const { toast } = useToast();
  const [pending, setPending] = useState<Status | null>(null);

  const detailQuery = useQuery({
    queryKey: ["get_content_item_for_viewer", contentItemId, traineeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_item_for_viewer" as never, {
        p_content_item_id: contentItemId,
        p_user_id: traineeId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  const contentItem = detailQuery.data?.content_item ?? null;
  const completion = detailQuery.data?.completion ?? null;
  const currentStatus: Status | null = completion?.live_event_attendance_status ?? null;

  const handleMark = async (status: Status) => {
    setPending(status);
    try {
      const { error } = await supabase.rpc("mark_live_event_attendance" as never, {
        p_content_item_id: contentItemId,
        p_trainee_user_id: traineeId,
        p_attendance_status: status,
      } as never);
      if (error) throw error;
      toast({ title: `Marked ${status}` });
      onActionComplete();
      detailQuery.refetch();
    } catch (err: any) {
      toast({ title: "Could not update attendance", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center py-12"
      >
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detailQuery.error || !contentItem) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">Failed to load review details.</p>
        <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-base">{contentItem.title ?? "Untitled"}</h3>
        {contentItem.description && (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {contentItem.description}
          </p>
        )}
        {contentItem.event_scheduled_at && (
          <p className="text-sm text-muted-foreground">Scheduled: {formatDate(contentItem.event_scheduled_at)}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Attendance</h4>
          {currentStatus && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {currentStatus}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((opt) => {
            const isCurrent = currentStatus === opt.value;
            return (
              <Button
                key={opt.value}
                variant={isCurrent ? "default" : "outline"}
                onClick={() => handleMark(opt.value)}
                disabled={pending !== null}
              >
                {pending === opt.value && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
