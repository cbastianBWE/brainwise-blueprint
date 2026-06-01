import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

interface PlatformFeatureRow {
  feature: string;
  enabled: boolean;
  label: string | null;
  category: string | null;
  updated_at: string | null;
}

interface SearchUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
}

type OverrideState = "default" | "allow" | "block";

const FALLBACK_INSTRUMENTS: { feature: string; label: string }[] = [
  { feature: "instrument:02618e9a-d411-44cf-b316-fe368edeac03", label: "PTP" },
  { feature: "instrument:77d1290f-1daf-44e0-931f-b9b8ad185520", label: "NAI" },
  { feature: "instrument:e5b3e839-d861-45ff-9f79-42887f5ae2de", label: "EPN" },
  { feature: "instrument:abb62120-8cc8-435f-babc-dd6a27fbc235", label: "AIRSA" },
  { feature: "instrument:90216d9d-153c-4b7b-abe0-1d7845c9e6e0", label: "HSS" },
];

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `updated ${d.toLocaleString()}`;
}

export default function PlatformFeatures() {
  // ---- Card 1: platform-wide flags ----
  const [rows, setRows] = useState<PlatformFeatureRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [pendingToggle, setPendingToggle] = useState<{ row: PlatformFeatureRow; next: boolean } | null>(null);
  const [platformReason, setPlatformReason] = useState("");
  const [platformBusy, setPlatformBusy] = useState(false);

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

  const instrumentList = useMemo(() => {
    if (rows.length > 0) {
      return rows.map(r => ({ feature: r.feature, label: r.label ?? r.feature }));
    }
    return FALLBACK_INSTRUMENTS;
  }, [rows]);

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

  // ---- Card 2: per-user overrides ----
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{
    user: SearchUser; feature: string; label: string; next: OverrideState;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) { setSearchResults([]); return; }
    let cancelled = false;
    (async () => {
      setSearching(true);
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: debouncedQuery,
        p_limit: 25,
        p_offset: 0,
        p_account_types: ["individual"],
      } as any);
      if (!cancelled) {
        if (error) {
          toast.error(`Search failed: ${error.message}`);
          setSearchResults([]);
        } else {
          setSearchResults((data ?? []) as SearchUser[]);
        }
        setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const loadOverrides = async (userId: string) => {
    setOverridesLoading(true);
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
    setOverridesLoading(false);
  };

  const selectUser = (u: SearchUser) => {
    setSelectedUser(u);
    loadOverrides(u.user_id);
  };

  const currentOverrideState = (feature: string): OverrideState => {
    if (!overrides.has(feature)) return "default";
    return overrides.get(feature) ? "allow" : "block";
  };

  const openOverrideDialog = (feature: string, label: string, next: OverrideState) => {
    if (!selectedUser) return;
    if (currentOverrideState(feature) === next) return;
    setOverrideReason("");
    setPendingOverride({ user: selectedUser, feature, label, next });
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
      p_user: pendingOverride.user.user_id,
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
    await loadOverrides(pendingOverride.user.user_id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Platform Features</h1>
        <p className="text-muted-foreground">
          Control instrument visibility for individual users platform-wide or per user.
        </p>
      </div>

      {/* Card 1 */}
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

      {/* Card 2 */}
      <Card>
        <CardHeader>
          <CardTitle>Per-individual overrides</CardTitle>
          <CardDescription>
            Grant or revoke an instrument for a specific individual user. Corporate users are rejected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search individuals by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {searching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : debouncedQuery && searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No individual users match.</p>
          ) : searchResults.length > 0 ? (
            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {searchResults.map(u => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${
                    selectedUser?.user_id === u.user_id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.full_name ?? "(no name)"}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {selectedUser && (
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedUser.full_name ?? "(no name)"}</div>
                  <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setOverrides(new Map()); }}>
                  Clear
                </Button>
              </div>

              {overridesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-2">
                  {instrumentList.map(inst => {
                    const state = currentOverrideState(inst.feature);
                    return (
                      <div key={inst.feature} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium">{inst.label}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{inst.feature}</div>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform-wide reason dialog */}
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

      {/* Override reason dialog */}
      <Dialog
        open={!!pendingOverride}
        onOpenChange={(o) => { if (!o && !overrideBusy) { setPendingOverride(null); setOverrideReason(""); } }}
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
  );
}
