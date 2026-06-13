import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ModuleEntitlementsPanel from "@/components/super-admin/ModuleEntitlementsPanel";
import OperationsWorkspaceSection from "@/components/super-admin/OperationsWorkspaceSection";

interface Props {
  userId: string;
  accountType: string | null;
  organizationId: string | null;
  email: string | null;
  fullName: string | null;
  setHasUnsavedChanges: (v: boolean) => void;
}

type OverrideState = "default" | "allow" | "block";

const FALLBACK_INSTRUMENTS: { feature: string; label: string }[] = [
  { feature: "instrument:02618e9a-d411-44cf-b316-fe368edeac03", label: "PTP" },
  { feature: "instrument:77d1290f-1daf-44e0-931f-b9b8ad185520", label: "NAI" },
  { feature: "instrument:e5b3e839-d861-45ff-9f79-42887f5ae2de", label: "EPN" },
  { feature: "instrument:abb62120-8cc8-435f-babc-dd6a27fbc235", label: "AIRSA" },
  { feature: "instrument:90216d9d-153c-4b7b-abe0-1d7845c9e6e0", label: "HSS" },
];

export default function MemberDrawerAccess({
  userId,
  setHasUnsavedChanges,
}: Props) {
  const [instruments, setInstruments] = useState<{ feature: string; label: string }[]>([]);
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pendingOverride, setPendingOverride] = useState<{
    feature: string;
    label: string;
    next: OverrideState;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(!!pendingOverride);
  }, [pendingOverride, setHasUnsavedChanges]);

  const loadInstruments = async () => {
    const { data, error } = await (supabase.from("platform_features" as any) as any)
      .select("feature, label")
      .like("feature", "instrument:%")
      .order("label");
    if (error || !data || data.length === 0) {
      setInstruments(FALLBACK_INSTRUMENTS);
    } else {
      setInstruments(
        (data as Array<{ feature: string; label: string | null }>).map((r) => ({
          feature: r.feature,
          label: r.label ?? r.feature,
        })),
      );
    }
  };

  const loadOverrides = async () => {
    const { data, error } = await supabase
      .from("member_feature_overrides")
      .select("feature, enabled")
      .eq("user_id", userId);
    if (error) {
      toast.error(`Failed to load overrides: ${error.message}`);
      setOverrides(new Map());
    } else {
      const m = new Map<string, boolean>();
      (data ?? []).forEach((r: any) => m.set(r.feature, r.enabled));
      setOverrides(m);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadInstruments(), loadOverrides()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const currentOverrideState = (feature: string): OverrideState => {
    if (!overrides.has(feature)) return "default";
    return overrides.get(feature) ? "allow" : "block";
  };

  const openOverrideDialog = (feature: string, label: string, next: OverrideState) => {
    if (currentOverrideState(feature) === next) return;
    setOverrideReason("");
    setPendingOverride({ feature, label, next });
  };

  const confirmOverride = async () => {
    if (!pendingOverride) return;
    const reason = overrideReason.trim();
    if (reason.length < 10) return;
    const p_enabled =
      pendingOverride.next === "allow" ? true :
      pendingOverride.next === "block" ? false : null;
    setOverrideBusy(true);
    const { error } = await (supabase.rpc as any)("individual_feature_override_set", {
      p_user: userId,
      p_feature: pendingOverride.feature,
      p_enabled,
      p_reason: reason,
    });
    setOverrideBusy(false);
    if (error) {
      toast.error(error.message ?? "Failed to set override");
      return;
    }
    toast.success(`Override updated for ${pendingOverride.label}`);
    setPendingOverride(null);
    setOverrideReason("");
    await loadOverrides();
  };

  return (
    <>
      <ModuleEntitlementsPanel
        principalType="user"
        userId={userId}
        setHasUnsavedChanges={setHasUnsavedChanges}
      />
      <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Per-instrument access overrides</h3>
        <p className="text-xs text-muted-foreground">
          Grant or revoke an instrument for this user. Overrides take precedence over
          the platform-wide flag.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-3 space-y-3">
          {instruments.map((inst) => {
            const state = currentOverrideState(inst.feature);
            return (
              <div key={inst.feature} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{inst.label}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {inst.feature}
                  </div>
                </div>
                <ToggleGroup
                  type="single"
                  value={state}
                  onValueChange={(val) => {
                    if (!val) return;
                    openOverrideDialog(inst.feature, inst.label, val as OverrideState);
                  }}
                >
                  <ToggleGroupItem value="default" size="sm">Default</ToggleGroupItem>
                  <ToggleGroupItem value="allow" size="sm">Allow</ToggleGroupItem>
                  <ToggleGroupItem value="block" size="sm">Block</ToggleGroupItem>
                </ToggleGroup>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!pendingOverride}
        onOpenChange={(o) => {
          if (!o && !overrideBusy) {
            setPendingOverride(null);
            setOverrideReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set {pendingOverride?.label} to {pendingOverride?.next}
            </DialogTitle>
            <DialogDescription>
              {pendingOverride?.next === "default"
                ? "This clears the override and falls back to the platform-wide flag."
                : pendingOverride?.next === "allow"
                  ? "This grants this user access regardless of the platform flag."
                  : "This blocks this user from this instrument regardless of the platform flag."}
              {" "}Provide a reason (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="override-reason">Reason</Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why are you making this change?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {overrideReason.trim().length}/10 minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPendingOverride(null); setOverrideReason(""); }}
              disabled={overrideBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmOverride}
              disabled={overrideBusy || overrideReason.trim().length < 10}
            >
              {overrideBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
