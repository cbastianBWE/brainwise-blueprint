import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PlatformFeatureRow {
  feature: string;
  enabled: boolean;
  label: string | null;
  category: string | null;
  updated_at: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `updated ${d.toLocaleString()}`;
}

export default function PlatformFeatures() {
  const [rows, setRows] = useState<PlatformFeatureRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [pendingToggle, setPendingToggle] = useState<{ row: PlatformFeatureRow; next: boolean } | null>(null);
  const [platformReason, setPlatformReason] = useState("");
  const [platformBusy, setPlatformBusy] = useState(false);

  // Trusted device settings
  const [tdLoading, setTdLoading] = useState(true);
  const [tdEnabled, setTdEnabled] = useState(true);
  const [tdWindowDays, setTdWindowDays] = useState(30);
  const [tdImpDays, setTdImpDays] = useState(1);
  const [tdSaveOpen, setTdSaveOpen] = useState(false);
  const [tdReason, setTdReason] = useState("");
  const [tdBusy, setTdBusy] = useState(false);

  const loadTdSettings = async () => {
    setTdLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_trusted_device_settings");
    if (!error && Array.isArray(data) && data[0]) {
      const row = data[0] as { window_days: number; impersonation_window_hours: number; enabled: boolean };
      setTdWindowDays(Number(row.window_days) || 30);
      setTdImpDays(Math.max(1, Math.round((Number(row.impersonation_window_hours) || 24) / 24)));
      setTdEnabled(!!row.enabled);
    } else if (error) {
      toast.error(`Failed to load trusted device settings: ${error.message}`);
    }
    setTdLoading(false);
  };


  const loadRows = async () => {
    setRowsLoading(true);
    const { data, error } = await (supabase.from("platform_features" as any) as any)
      .select("feature, enabled, label, category, updated_at")
      .like("feature", "instrument:%")
      .order("label");
    if (error) {
      toast.error(`Failed to load platform features: ${error.message}`);
      setRows([]);
    } else {
      setRows((data ?? []) as PlatformFeatureRow[]);
    }
    setRowsLoading(false);
  };

  useEffect(() => { loadRows(); }, []);

  const openToggleDialog = (row: PlatformFeatureRow, next: boolean) => {
    setPlatformReason("");
    setPendingToggle({ row, next });
  };

  const confirmPlatformToggle = async () => {
    if (!pendingToggle) return;
    const { row, next } = pendingToggle;
    const reason = platformReason.trim();
    if (reason.length < 10) return;
    setPlatformBusy(true);
    const { error } = await (supabase.rpc as any)("platform_feature_set", {
      p_feature: row.feature,
      p_enabled: next,
      p_reason: reason,
    });
    setPlatformBusy(false);
    if (error) {
      toast.error(error.message ?? "Failed to update platform feature");
      return;
    }
    setRows(prev => prev.map(r => r.feature === row.feature
      ? { ...r, enabled: next, updated_at: new Date().toISOString() }
      : r));
    toast.success(`${row.label ?? row.feature} ${next ? "enabled" : "disabled"} platform-wide`);
    setPendingToggle(null);
    setPlatformReason("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Global Features & Settings</h1>
        <p className="text-muted-foreground">
          Platform-wide instrument visibility and global settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform-wide instrument flags</CardTitle>
          <CardDescription>
            Toggles here affect visibility for ALL individual users. Corporate users are unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rowsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform features found.</p>
          ) : (
            rows.map(row => (
              <div
                key={row.feature}
                className="flex items-center justify-between gap-4 rounded-md border p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium">{row.label ?? row.feature}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{row.feature}</div>
                  {row.updated_at && (
                    <div className="text-xs text-muted-foreground mt-1">{formatRelative(row.updated_at)}</div>
                  )}
                </div>
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(next) => openToggleDialog(row, next)}
                  aria-label={`Toggle ${row.label ?? row.feature}`}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o && !platformBusy) { setPendingToggle(null); setPlatformReason(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingToggle?.next ? "Enable" : "Disable"} {pendingToggle?.row.label ?? pendingToggle?.row.feature}
            </DialogTitle>
            <DialogDescription>
              Provide a reason (minimum 10 characters). This will be audited.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span>This changes visibility for ALL individual users.</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform-reason">Reason</Label>
            <Textarea
              id="platform-reason"
              value={platformReason}
              onChange={(e) => setPlatformReason(e.target.value)}
              placeholder="Why are you making this change?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {platformReason.trim().length}/10 minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPendingToggle(null); setPlatformReason(""); }}
              disabled={platformBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPlatformToggle}
              disabled={platformBusy || platformReason.trim().length < 10}
            >
              {platformBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
