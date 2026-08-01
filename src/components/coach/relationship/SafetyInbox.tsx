import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import {
  ALERT_STATUSES, fetchSafetyInbox, firstRow, SEVERITY_LABEL, severityClasses,
  type AlertStatus, type OkReason, type SafetyAlertRow,
} from "./couplesShared";

/**
 * Surface 3 — triaged, content-free safety inbox. The alert carries only
 * category, severity and status; there is no narrative to request or render.
 */
export default function SafetyInbox({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<SafetyAlertRow[] | null>(null);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(await fetchSafetyInbox(includeResolved));
  }, [includeResolved]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (alertId: string, status: AlertStatus) => {
    setBusy(alertId);
    const { data, error } = await supabase.rpc("relationship_coach_ack_alert", {
      p_alert: alertId,
      p_status: status,
    });
    const res = firstRow<{ ok: boolean; reason: string }>(data) as OkReason;
    if (error || !res?.ok) {
      toast.error(res?.reason ? `Couldn't update: ${res.reason}` : "Couldn't update that alert.");
    } else {
      await load();
      onChanged?.();
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Flags across your couples. Categories and severity only — reach the couple through your own channels.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            id="include-resolved"
            checked={includeResolved}
            onCheckedChange={setIncludeResolved}
          />
          <Label htmlFor="include-resolved" className="text-sm">Show resolved</Label>
        </div>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing needs your attention right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card
              key={a.alert_id}
              className={a.safeguarding ? "border-destructive" : undefined}
            >
              <CardContent className="space-y-3 p-4">
                {a.safeguarding && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    Child safeguarding — mandatory reporting weight
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.subject_label ?? "Partner"}</p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${severityClasses(a.severity)}`}
                      >
                        {a.severity ? SEVERITY_LABEL[a.severity] ?? a.severity : "Unrated"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(a.categories ?? []).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Raised {format(new Date(a.created_at), "d MMM yyyy, HH:mm")}
                      {a.acknowledged_at &&
                        ` · acknowledged ${format(new Date(a.acknowledged_at), "d MMM yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {busy === a.alert_id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Select
                      value={a.status}
                      onValueChange={(v) => setStatus(a.alert_id, v as AlertStatus)}
                      disabled={busy === a.alert_id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
