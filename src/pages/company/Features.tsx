import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountRole } from "@/lib/accountRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ShieldCheck, Users2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface EffectiveFeatures {
  organization_id: string;
  tier_name: string;
  instruments_included: string[];
  monthly_ai_pulls_allowance: number;
  monthly_chat_allowance_per_user: number;
  monthly_coaching_query_allowance: number;
  ai_chat_enabled: boolean;
  dashboard_access_level: string;
  supervisor_dashboard_enabled: boolean;
}

interface Instrument {
  id: string;
  short_name: string;
  instrument_name: string;
}

interface OrgMember {
  id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  deactivated_at: string | null;
}

interface Override {
  user_id: string;
  feature: string;
  enabled: boolean;
}

/* ---------- Helpers ---------- */

const ROLE_LABELS: Record<string, string> = {
  corporate_employee: "Employee",
  company_admin: "Company Admin",
  org_admin: "Org Admin",
};

function formatRole(accountType: string | null): string {
  if (!accountType) return "—";
  return ROLE_LABELS[accountType] ?? accountType;
}

function formatDashboardAccess(level: string): string {
  switch (level) {
    case "full": return "Full";
    case "basic": return "Basic";
    case "none": return "None";
    default: return level;
  }
}

const PAGE_SIZE = 20;

/* ---------- Component ---------- */

export default function Features() {
  const { user } = useAuth();
  const { isOrgAdmin, loading: roleLoading } = useAccountRole();

  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<EffectiveFeatures | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const [supervisorInFlight, setSupervisorInFlight] = useState(false);

  /* ---------- Initial load ---------- */

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [featuresRes, instrumentsRes, membersRes, overridesRes] = await Promise.all([
          supabase.from("organization_features_view").select("*").limit(1).maybeSingle(),
          supabase.from("instruments").select("id, short_name, instrument_name").order("instrument_id"),
          supabase.from("admin_org_users_view").select("id, email, full_name, account_type, deactivated_at").order("full_name", { nullsFirst: false }),
          supabase.from("member_feature_overrides").select("user_id, feature, enabled"),
        ]);

        if (cancelled) return;

        if (featuresRes.error) throw featuresRes.error;
        if (instrumentsRes.error) throw instrumentsRes.error;
        if (membersRes.error) throw membersRes.error;
        if (overridesRes.error) throw overridesRes.error;

        setFeatures(featuresRes.data as EffectiveFeatures | null);
        setInstruments((instrumentsRes.data ?? []) as Instrument[]);
        // Exclude deactivated users from the overrides table
        setMembers(((membersRes.data ?? []) as OrgMember[]).filter((m) => !m.deactivated_at));
        setOverrides((overridesRes.data ?? []) as Override[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("Failed to load features: " + msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  /* ---------- Derived data ---------- */

  // Instruments that are in the contract, in stable order
  const contractInstruments = useMemo(() => {
    if (!features) return [];
    const included = new Set(features.instruments_included);
    return instruments.filter((i) => included.has(i.id));
  }, [features, instruments]);

  // Map from (user_id + feature) to override row
  const overrideMap = useMemo(() => {
    const m = new Map<string, Override>();
    for (const o of overrides) {
      m.set(`${o.user_id}:${o.feature}`, o);
    }
    return m;
  }, [overrides]);

  // Derive: does this (user, feature) currently have access?
  // access = contract enabled AND no disabling override
  function hasAccess(userId: string, featureKey: string, contractGranted: boolean): boolean {
    if (!contractGranted) return false;
    const ov = overrideMap.get(`${userId}:${featureKey}`);
    if (!ov) return true; // no override, default access
    return ov.enabled;
  }

  // Filtered + paginated members
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.full_name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pagedMembers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  // Reset to page 0 when search changes
  useEffect(() => { setPage(0); }, [search]);

  /* ---------- Handlers ---------- */

  async function handleToggle(userId: string, featureKey: string, newEnabled: boolean) {
    const flightKey = `${userId}:${featureKey}`;
    if (inFlight.has(flightKey)) return;

    setInFlight((prev) => new Set(prev).add(flightKey));

    // Optimistic: update local overrides
    const prevOverrides = overrides;
    setOverrides((curr) => {
      const filtered = curr.filter((o) => !(o.user_id === userId && o.feature === featureKey));
      return [...filtered, { user_id: userId, feature: featureKey, enabled: newEnabled }];
    });

    const { error } = await supabase.rpc("member_feature_override_set", {
      p_user: userId,
      p_feature: featureKey,
      p_enabled: newEnabled,
    });

    setInFlight((prev) => {
      const next = new Set(prev);
      next.delete(flightKey);
      return next;
    });

    if (error) {
      // Revert
      setOverrides(prevOverrides);
      toast.error(error.message || "Failed to update override.");
    }
  }

  async function handleSupervisorToggle(newEnabled: boolean) {
    if (supervisorInFlight || !features) return;
    setSupervisorInFlight(true);

    const prev = features.supervisor_dashboard_enabled;
    setFeatures({ ...features, supervisor_dashboard_enabled: newEnabled });

    const { error } = await supabase.rpc("supervisor_dashboard_set", {
      p_org: features.organization_id,
      p_enabled: newEnabled,
    });

    setSupervisorInFlight(false);

    if (error) {
      setFeatures({ ...features, supervisor_dashboard_enabled: prev });
      toast.error(error.message || "Failed to update supervisor dashboard setting.");
    }
  }

  /* ---------- Render ---------- */

  if (loading || roleLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Features</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's contract features and per-member overrides.
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading features...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!features) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Features</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No contract found for your organization. Contact your BrainWise representative.
          </CardContent>
        </Card>
      </div>
    );
  }

  const instrumentNameMap = new Map(instruments.map((i) => [i.id, i]));
  const contractInstrumentNames = features.instruments_included
    .map((id) => instrumentNameMap.get(id)?.short_name ?? id)
    .join(", ");

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Features</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's contract features and per-member overrides.
          </p>
        </div>

        {/* ---------- Card 1: Effective Features ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Effective Features
            </CardTitle>
            <CardDescription>
              Your current contract configuration. Read-only — contact BrainWise to modify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tier</p>
                <p className="text-lg font-semibold mt-1">{features.tier_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instruments Included</p>
                <p className="text-lg font-semibold mt-1">
                  {contractInstrumentNames || "None"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Chat</p>
                <p className="mt-1">
                  <Badge variant={features.ai_chat_enabled ? "default" : "secondary"}>
                    {features.ai_chat_enabled ? "Enabled" : "Not included"}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dashboard Access</p>
                <p className="text-lg font-semibold mt-1">
                  {formatDashboardAccess(features.dashboard_access_level)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Pulls / Month</p>
                <p className="text-lg font-semibold mt-1">
                  {features.monthly_ai_pulls_allowance}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chat Messages / User / Month</p>
                <p className="text-lg font-semibold mt-1">
                  {features.monthly_chat_allowance_per_user}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Coaching Queries / Month</p>
                <p className="text-lg font-semibold mt-1">
                  {features.monthly_coaching_query_allowance}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground border-t pt-4">
              For contract changes (tier upgrades, instrument additions, allowance adjustments), contact your BrainWise representative.
            </p>
          </CardContent>
        </Card>

        {/* ---------- Card 2: Supervisor Dashboard (org_admin only) ---------- */}
        {isOrgAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Dashboard Access</CardTitle>
              <CardDescription>
                When enabled, supervisors in your organization can view dashboards for their direct reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">Enable team dashboards for supervisors</p>
                  <p className="text-sm text-muted-foreground">
                    Affects all users with direct reports. Does not override individual privacy settings.
                  </p>
                </div>
                <Switch
                  checked={features.supervisor_dashboard_enabled}
                  disabled={supervisorInFlight}
                  onCheckedChange={handleSupervisorToggle}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------- Card 3: Member Feature Overrides ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Member Feature Overrides
            </CardTitle>
            <CardDescription>
              Disable specific features for individual members. Cannot grant features beyond your contract.
              Deactivated members are not shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {search ? "No members match your search." : "No active members in your organization."}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">AI Chat</TableHead>
                        {contractInstruments.map((inst) => (
                          <TableHead key={inst.id} className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{inst.short_name}</span>
                              </TooltipTrigger>
                              <TooltipContent>{inst.instrument_name}</TooltipContent>
                            </Tooltip>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedMembers.map((m) => {
                        const aiChatAccess = hasAccess(m.id, "ai_chat", features.ai_chat_enabled);
                        const aiChatInFlight = inFlight.has(`${m.id}:ai_chat`);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{m.email}</TableCell>
                            <TableCell>{formatRole(m.account_type)}</TableCell>
                            <TableCell className="text-center">
                              {features.ai_chat_enabled ? (
                                <Switch
                                  checked={aiChatAccess}
                                  disabled={aiChatInFlight}
                                  onCheckedChange={(checked) => handleToggle(m.id, "ai_chat", checked)}
                                />
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Switch checked={false} disabled />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Not in your organization's contract</TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            {contractInstruments.map((inst) => {
                              const featureKey = `instrument:${inst.id}`;
                              const access = hasAccess(m.id, featureKey, true);
                              const flight = inFlight.has(`${m.id}:${featureKey}`);
                              return (
                                <TableCell key={inst.id} className="text-center">
                                  <Switch
                                    checked={access}
                                    disabled={flight}
                                    onCheckedChange={(checked) => handleToggle(m.id, featureKey, checked)}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
