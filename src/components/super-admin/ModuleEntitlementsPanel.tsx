import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

type PrincipalType = "user" | "org";
type ModuleState = "default" | "allow" | "block";

interface ModuleRow {
  module: string;
  label: string;
  default_enabled: boolean;
  is_enforced: boolean;
  override_effect: "grant" | "deny" | null;
  override_source: string | null;
  override_ends_at: string | null;
  effective_enabled: boolean;
}

interface Props {
  principalType: PrincipalType;
  userId?: string | null;
  orgId?: string | null;
  setHasUnsavedChanges?: (v: boolean) => void;
}

export default function ModuleEntitlementsPanel({
  principalType,
  userId = null,
  orgId = null,
  setHasUnsavedChanges,
}: Props) {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{
    module: string;
    label: string;
    next: ModuleState;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges?.(!!pending);
  }, [pending, setHasUnsavedChanges]);

  const load = async () => {
    const { data, error } = await (supabase.rpc as any)(
      "module_entitlement_admin_list",
      {
        p_principal_type: principalType,
        p_user_id: principalType === "user" ? userId : null,
        p_org_id: principalType === "org" ? orgId : null,
      },
    );
    if (error) {
      toast.error(`Failed to load modules: ${error.message}`);
      setRows([]);
    } else {
      setRows((data ?? []) as ModuleRow[]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalType, userId, orgId]);

  const stateOf = (r: ModuleRow): ModuleState =>
    r.override_effect === "grant"
      ? "allow"
      : r.override_effect === "deny"
        ? "block"
        : "default";

  const openDialog = (r: ModuleRow, next: ModuleState) => {
    if (stateOf(r) === next) return;
    setReason("");
    setPending({ module: r.module, label: r.label, next });
  };

  const confirm = async () => {
    if (!pending) return;
    const r = reason.trim();
    if (r.length < 10) return;
    setBusy(true);
    let error: any = null;
    const base = {
      p_principal_type: principalType,
      p_user_id: principalType === "user" ? userId : null,
      p_org_id: principalType === "org" ? orgId : null,
    };
    if (pending.next === "allow") {
      ({ error } = await (supabase.rpc as any)("module_entitlement_grant", {
        ...base,
        p_module: pending.module,
        p_source: "manual_invoice",
        p_ends_at: null,
        p_reason: r,
      }));
    } else if (pending.next === "block") {
      ({ error } = await (supabase.rpc as any)("module_entitlement_deny", {
        ...base,
        p_module: pending.module,
        p_ends_at: null,
        p_reason: r,
      }));
    } else {
      ({ error } = await (supabase.rpc as any)("module_entitlement_revoke", {
        ...base,
        p_module: pending.module,
        p_reason: r,
      }));
    }
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Failed to update module");
      return;
    }
    toast.success(`Module updated: ${pending.label}`);
    setPending(null);
    setReason("");
    await load();
  };

  const principalNoun = principalType === "org" ? "organization" : "user";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Module access</h3>
        <p className="text-xs text-muted-foreground">
          Turn platform modules on or off for this {principalNoun}. "Default" follows
          the platform default, "On" forces access, "Off" blocks it regardless of the
          default.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-3 space-y-3">
          {rows.map((r) => {
            const state = stateOf(r);
            return (
              <div
                key={r.module}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.label}</span>
                    <Badge variant={r.effective_enabled ? "default" : "secondary"}>
                      {r.effective_enabled ? "On" : "Off"}
                    </Badge>
                    {!r.is_enforced && (
                      <Badge variant="outline">Not enforced yet</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {state === "default"
                      ? `Follows default (${r.default_enabled ? "on" : "off"})`
                      : state === "allow"
                        ? "Forced on"
                        : "Forced off"}
                  </div>
                </div>
                <ToggleGroup
                  type="single"
                  value={state}
                  onValueChange={(val) => {
                    if (val) openDialog(r, val as ModuleState);
                  }}
                >
                  <ToggleGroupItem value="default" size="sm">
                    Default
                  </ToggleGroupItem>
                  <ToggleGroupItem value="allow" size="sm">
                    On
                  </ToggleGroupItem>
                  <ToggleGroupItem value="block" size="sm">
                    Off
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o && !busy) {
            setPending(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set {pending?.label} to{" "}
              {pending?.next === "allow"
                ? "On"
                : pending?.next === "block"
                  ? "Off"
                  : "Default"}
            </DialogTitle>
            <DialogDescription>
              {pending?.next === "default"
                ? "Clears the override and falls back to the platform default."
                : pending?.next === "allow"
                  ? `Forces this module on for this ${principalNoun} regardless of the default.`
                  : `Blocks this module for this ${principalNoun} regardless of the default.`}
              {" "}Provide a reason (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="module-override-reason">Reason</Label>
            <Textarea
              id="module-override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you making this change?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/10 minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPending(null);
                setReason("");
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={busy || reason.trim().length < 10}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
