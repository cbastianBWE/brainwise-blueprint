import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface BulkProgressProps {
  totalUsers: number;
  isRunning: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  cancelled: boolean;
  onCancel: () => void;
}

export default function BulkProgress({
  totalUsers,
  isRunning,
  processed,
  succeeded,
  failed,
  cancelled,
  onCancel,
}: BulkProgressProps) {
  const percent = totalUsers === 0 ? 0 : Math.round((processed / totalUsers) * 100);
  const complete = !isRunning && processed > 0;
  const statusText = cancelled
    ? `Cancelled. ${processed} of ${totalUsers} processed.`
    : isRunning
      ? `Processing ${processed} of ${totalUsers}…`
      : complete
        ? `Done. ${processed} of ${totalUsers} processed.`
        : `${totalUsers} users to process`;

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{statusText}</span>
        {isRunning && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <Progress value={percent} />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Succeeded:{" "}
          <span className="font-semibold text-emerald-600">{succeeded}</span>
        </span>
        <span>
          Failed: <span className="font-semibold text-amber-600">{failed}</span>
        </span>
        {isRunning && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
      </div>
    </div>
  );
}
