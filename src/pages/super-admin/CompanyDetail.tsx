import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminSession } from "@/hooks/useSuperAdminSession";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Building2, UserCog, UserPlus, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Save, RotateCcw } from "lucide-react";

interface OrgUser {
  id: string;
  full_name: string | null;
  email: string;
  account_type: string | null;
  subscription_status: string;
  has_completed: boolean;
}

export default function CompanyDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const { sessionId } = useSuperAdminSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const auditLoggedRef = useRef(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !user) return;

    // Fetch org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    setOrgName(org?.name || "Unknown Organization");

    // Fetch users in org
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id, full_name, email, account_type, subscription_status")
      .eq("organization_id", orgId);

    if (!orgUsers) { setLoading(false); return; }

    // Check completed assessments for each user
    const userIds = orgUsers.map(u => u.id);
    const { data: completedAssessments } = await supabase
      .from("assessments")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed");

    const completedSet = new Set(completedAssessments?.map(a => a.user_id) || []);

    const enriched: OrgUser[] = orgUsers.map(u => ({
      ...u,
      has_completed: completedSet.has(u.id),
    }));

    setUsers(enriched);
    setLoading(false);

    // Audit logging — fire once
    if (!auditLoggedRef.current) {
      auditLoggedRef.current = true;

      const entries = [
        {
          action_type: "company_account_viewed",
          company_id: orgId,
          session_id: sessionId,
          detail: { url: window.location.pathname, timestamp: new Date().toISOString() },
        },
        ...enriched.map(u => ({
          action_type: "individual_record_viewed",
          company_id: orgId,
          affected_user_id: u.id,
          session_id: sessionId,
          detail: { url: window.location.pathname, timestamp: new Date().toISOString() },
        })),
      ];

      await supabase.functions.invoke("log-audit", { body: { entries } });
    }
  }, [orgId, user, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentOrgAdmin = useMemo(
    () => users.find((u) => u.account_type === "org_admin") || null,
    [users]
  );

  const handleAssignOrgAdmin = async () => {
    if (!assignEmail.trim() || !orgId) return;
    setAssigning(true);

    const { error } = await supabase.rpc("admin_assign_org_admin", {
      p_target_email: assignEmail.trim(),
      p_organization_id: orgId,
      p_is_transfer: !!currentOrgAdmin,
    });

    setAssigning(false);

    if (error) {
      toast({
        title: currentOrgAdmin ? "Transfer failed" : "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: currentOrgAdmin ? "Org admin transferred" : "Org admin assigned",
      description: `${assignEmail.trim()} is now the org admin.`,
    });

    setAssignDialogOpen(false);
    setAssignEmail("");
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => navigate("/super-admin/companies")}>
        <ArrowLeft className="h-4 w-4" /> Back to Company Accounts
      </Button>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contract">Contract & Features</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Scoped banner */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 py-4">
              <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                You are viewing <strong>{orgName}</strong>. Data on this page is scoped to this organization only.
              </p>
            </CardContent>
          </Card>

          {/* Org Admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="h-5 w-5 text-primary" />
                Org Admin
              </CardTitle>
              <CardDescription>
                The contract-owning administrator for this organization. Exactly one per org.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentOrgAdmin ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">
                      {currentOrgAdmin.full_name || currentOrgAdmin.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{currentOrgAdmin.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => { setAssignEmail(""); setAssignDialogOpen(true); }}
                  >
                    <UserCog className="h-4 w-4" />
                    Transfer to Another User
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-muted-foreground">No org admin assigned.</p>
                  <Button
                    className="gap-2"
                    onClick={() => { setAssignEmail(""); setAssignDialogOpen(true); }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign Org Admin
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{orgName} — Users</CardTitle>
              <CardDescription>{users.length} member{users.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Assessment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.full_name || <span className="text-muted-foreground italic">No name</span>}
                        </TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{u.account_type || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.subscription_status === "active" ? "default" : "outline"}>
                            {u.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.has_completed ? (
                            <Badge className="bg-accent text-accent-foreground">Completed</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <ContractFeaturesSection
            orgId={orgId!}
            onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
            onSuccess={(msg) => toast({ title: "Saved", description: msg })}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => !assigning && setAssignDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentOrgAdmin ? "Transfer Org Admin" : "Assign Org Admin"}
            </DialogTitle>
            <DialogDescription>
              {currentOrgAdmin
                ? `${currentOrgAdmin.full_name || currentOrgAdmin.email} will be demoted to Company Admin. The new Org Admin must already be a member of this organization.`
                : "The user must already be a member of this organization (account type corporate_employee or company_admin)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-email">User Email</Label>
            <Input
              id="assign-email"
              type="email"
              placeholder="user@company.com"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              disabled={assigning}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignOrgAdmin} disabled={assigning || !assignEmail.trim()}>
              {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentOrgAdmin ? "Transfer" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// NOTE: (supabase as any) casts are intentional. src/integrations/supabase/types.ts
// is stale this session; full regeneration is Item 83 (separate task).

interface ContractFeaturesSectionProps {
  orgId: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

interface SubscriptionTier {
  id: string;
  name: string;
  instruments_included: string[];
  monthly_ai_pulls_allowance: number;
  monthly_chat_allowance_per_user: number;
  monthly_coaching_query_allowance: number;
  dashboard_access_level: "none" | "basic" | "full";
  ai_chat_enabled: boolean;
  seat_count_default: number;
}

interface ContractRow {
  id: string;
  organization_id: string;
  tier_id: string;
  start_date: string;
  end_date: string | null;
  seat_count: number;
  instruments_included_override: string[] | null;
  monthly_ai_pulls_allowance_override: number | null;
  monthly_chat_allowance_per_user_override: number | null;
  monthly_coaching_query_allowance_override: number | null;
  ai_chat_enabled_override: boolean | null;
  dashboard_access_level_override: "none" | "basic" | "full" | null;
  data_retention_mode: "standard" | "strict";
  supervisor_dashboard_enabled: boolean;
  notes: string | null;
}

const INSTRUMENTS = [
  { id: "02618e9a-d411-44cf-b316-fe368edeac03", code: "PTP", label: "PTP" },
  { id: "77d1290f-1daf-44e0-931f-b9b8ad185520", code: "NAI", label: "NAI" },
  { id: "abb62120-8cc8-435f-babc-dd6a27fbc235", code: "AIRSA", label: "AIRSA" },
  { id: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", code: "HSS", label: "HSS" },
];

function ContractFeaturesSection({ orgId, onError, onSuccess }: ContractFeaturesSectionProps) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [, setContract] = useState<ContractRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tierId, setTierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [dataRetentionMode, setDataRetentionMode] = useState<"standard" | "strict">("standard");
  const [notes, setNotes] = useState("");

  const [overrideInstruments, setOverrideInstruments] = useState(false);
  const [instrumentSelections, setInstrumentSelections] = useState<Set<string>>(new Set());

  const [overrideAiChat, setOverrideAiChat] = useState(false);
  const [aiChatEnabled, setAiChatEnabled] = useState(false);
  const [overrideAiPulls, setOverrideAiPulls] = useState(false);
  const [aiPullsValue, setAiPullsValue] = useState("");
  const [overrideChatPerUser, setOverrideChatPerUser] = useState(false);
  const [chatPerUserValue, setChatPerUserValue] = useState("");
  const [overrideCoaching, setOverrideCoaching] = useState(false);
  const [coachingValue, setCoachingValue] = useState("");
  const [overrideDashboard, setOverrideDashboard] = useState(false);
  const [dashboardLevel, setDashboardLevel] = useState<"none" | "basic" | "full">("basic");

  const [resetPool, setResetPool] = useState<"chat" | "org_interpretation" | "coaching_query" | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tiersRes, contractRes] = await Promise.all([
      (supabase as any).from("subscription_tiers").select("*").eq("is_active", true).order("name"),
      (supabase as any).from("corporate_contracts").select("*").eq("organization_id", orgId).maybeSingle(),
    ]);
    if (tiersRes.error) { onError(tiersRes.error.message); setLoading(false); return; }
    if (contractRes.error) { onError(contractRes.error.message); setLoading(false); return; }

    setTiers(tiersRes.data || []);

    if (contractRes.data) {
      const c = contractRes.data as ContractRow;
      setContract(c);
      setTierId(c.tier_id);
      setStartDate(c.start_date);
      setEndDate(c.end_date ?? "");
      setSeatCount(String(c.seat_count));
      setDataRetentionMode(c.data_retention_mode);
      setNotes(c.notes ?? "");

      setOverrideInstruments(c.instruments_included_override !== null);
      setInstrumentSelections(new Set(c.instruments_included_override ?? []));

      setOverrideAiChat(c.ai_chat_enabled_override !== null);
      setAiChatEnabled(c.ai_chat_enabled_override ?? false);

      setOverrideAiPulls(c.monthly_ai_pulls_allowance_override !== null);
      setAiPullsValue(c.monthly_ai_pulls_allowance_override !== null ? String(c.monthly_ai_pulls_allowance_override) : "");

      setOverrideChatPerUser(c.monthly_chat_allowance_per_user_override !== null);
      setChatPerUserValue(c.monthly_chat_allowance_per_user_override !== null ? String(c.monthly_chat_allowance_per_user_override) : "");

      setOverrideCoaching(c.monthly_coaching_query_allowance_override !== null);
      setCoachingValue(c.monthly_coaching_query_allowance_override !== null ? String(c.monthly_coaching_query_allowance_override) : "");

      setOverrideDashboard(c.dashboard_access_level_override !== null);
      setDashboardLevel(c.dashboard_access_level_override ?? "basic");
    }

    setLoading(false);
  }, [orgId, onError]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedTier = tiers.find(t => t.id === tierId);

  const handleSave = async () => {
    if (!tierId) { onError("Select a tier first."); return; }
    if (!startDate) { onError("Start date is required."); return; }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      onError("End date must be on or after start date."); return;
    }
    const seatCountNum = Number(seatCount);
    if (isNaN(seatCountNum) || seatCountNum < 0) {
      onError("Seat count must be zero or positive."); return;
    }

    setSaving(true);
    const { error } = await (supabase.rpc as any)("contract_upsert", {
      p_organization_id: orgId,
      p_tier_id: tierId,
      p_start_date: startDate,
      p_end_date: endDate || null,
      p_seat_count: seatCountNum,
      p_data_retention_mode: dataRetentionMode,
      p_notes: notes.trim() || null,
      p_instruments_included_override: overrideInstruments ? Array.from(instrumentSelections) : null,
      p_monthly_ai_pulls_allowance_override: overrideAiPulls && aiPullsValue !== "" ? Number(aiPullsValue) : null,
      p_monthly_chat_allowance_per_user_override: overrideChatPerUser && chatPerUserValue !== "" ? Number(chatPerUserValue) : null,
      p_monthly_coaching_query_allowance_override: overrideCoaching && coachingValue !== "" ? Number(coachingValue) : null,
      p_ai_chat_enabled_override: overrideAiChat ? aiChatEnabled : null,
      p_dashboard_access_level_override: overrideDashboard ? dashboardLevel : null,
    });
    setSaving(false);

    if (error) { onError(error.message); return; }
    onSuccess("Contract saved.");
    await loadData();
  };

  const handleResetCounter = async () => {
    if (!resetPool) return;
    setResetting(true);
    const { error } = await (supabase.rpc as any)("ai_counter_reset", {
      p_org: orgId,
      p_pool: resetPool,
      p_user_id: null,
    });
    setResetting(false);
    if (error) { onError(error.message); return; }
    onSuccess(`Counter reset: ${resetPool}`);
    setResetPool(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Contract Basics
          </CardTitle>
          <CardDescription>Tier assignment, dates, seat count, data retention policy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tier *</Label>
              <Select value={tierId} onValueChange={setTierId} disabled={saving}>
                <SelectTrigger><SelectValue placeholder="Select a tier" /></SelectTrigger>
                <SelectContent>
                  {tiers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTier && (
                <p className="text-xs text-muted-foreground">
                  Defaults: {selectedTier.seat_count_default} seats, {selectedTier.monthly_ai_pulls_allowance} pulls, {selectedTier.monthly_chat_allowance_per_user} chat/user, {selectedTier.monthly_coaching_query_allowance} coaching, dashboard {selectedTier.dashboard_access_level}, AI chat {selectedTier.ai_chat_enabled ? "on" : "off"}.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Seat Count *</Label>
              <Input type="number" min={0} value={seatCount} onChange={(e) => setSeatCount(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Data Retention Mode</Label>
              <Select value={dataRetentionMode} onValueChange={(v) => setDataRetentionMode(v as "standard" | "strict")} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (pseudonymize on departure)</SelectItem>
                  <SelectItem value="strict">Strict (full deletion on departure)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instruments</CardTitle>
          <CardDescription>Which assessments are included for this org. Leave switch off to follow tier default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Override tier default</Label>
              <p className="text-xs text-muted-foreground">
                Tier default: {selectedTier ? (INSTRUMENTS.filter(i => selectedTier.instruments_included.includes(i.id)).map(i => i.code).join(", ") || "none") : "—"}
              </p>
            </div>
            <Switch checked={overrideInstruments} onCheckedChange={setOverrideInstruments} disabled={saving} />
          </div>
          {overrideInstruments && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {INSTRUMENTS.map(inst => (
                <div key={inst.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`inst-${inst.code}`}
                    checked={instrumentSelections.has(inst.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(instrumentSelections);
                      if (checked) next.add(inst.id); else next.delete(inst.id);
                      setInstrumentSelections(next);
                    }}
                    disabled={saving}
                  />
                  <Label htmlFor={`inst-${inst.code}`} className="cursor-pointer">{inst.label}</Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Settings</CardTitle>
          <CardDescription>Override tier defaults for AI chat and allowances. Leave switch off to follow tier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OverrideField
            label="AI Chat Enabled"
            tierDefault={selectedTier ? (selectedTier.ai_chat_enabled ? "on" : "off") : "—"}
            enabled={overrideAiChat}
            onEnabledChange={setOverrideAiChat}
            disabled={saving}
          >
            <div className="flex items-center gap-3">
              <Switch checked={aiChatEnabled} onCheckedChange={setAiChatEnabled} disabled={saving} />
              <span className="text-sm">{aiChatEnabled ? "Enabled" : "Disabled"}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Monthly AI Pulls Allowance (org-level dashboard regenerate)"
            tierDefault={selectedTier ? String(selectedTier.monthly_ai_pulls_allowance) : "—"}
            enabled={overrideAiPulls}
            onEnabledChange={setOverrideAiPulls}
            disabled={saving}
          >
            <Input type="number" min={0} value={aiPullsValue} onChange={(e) => setAiPullsValue(e.target.value)} disabled={saving} />
          </OverrideField>

          <OverrideField
            label="Chat Allowance per User"
            tierDefault={selectedTier ? String(selectedTier.monthly_chat_allowance_per_user) : "—"}
            enabled={overrideChatPerUser}
            onEnabledChange={setOverrideChatPerUser}
            disabled={saving}
          >
            <Input type="number" min={0} value={chatPerUserValue} onChange={(e) => setChatPerUserValue(e.target.value)} disabled={saving} />
          </OverrideField>

          <OverrideField
            label="Coaching Query Allowance"
            tierDefault={selectedTier ? String(selectedTier.monthly_coaching_query_allowance) : "—"}
            enabled={overrideCoaching}
            onEnabledChange={setOverrideCoaching}
            disabled={saving}
          >
            <Input type="number" min={0} value={coachingValue} onChange={(e) => setCoachingValue(e.target.value)} disabled={saving} />
          </OverrideField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dashboard Access</CardTitle>
          <CardDescription>Level of dashboard functionality available to the org.</CardDescription>
        </CardHeader>
        <CardContent>
          <OverrideField
            label="Dashboard Access Level"
            tierDefault={selectedTier?.dashboard_access_level ?? "—"}
            enabled={overrideDashboard}
            onEnabledChange={setOverrideDashboard}
            disabled={saving}
          >
            <Select value={dashboardLevel} onValueChange={(v) => setDashboardLevel(v as "none" | "basic" | "full")} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </OverrideField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reset Monthly Counters</CardTitle>
          <CardDescription>Zero the current month's usage for this org. Writes audit entry.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setResetPool("org_interpretation")}>
            <RotateCcw className="h-4 w-4" /> Reset AI Pulls
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setResetPool("coaching_query")}>
            <RotateCcw className="h-4 w-4" /> Reset Coaching Queries
          </Button>
          <div className="w-full text-xs text-muted-foreground">
            Chat counter resets are per-user and handled in Session 17 UI.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" /> Save Contract
        </Button>
      </div>

      <Dialog open={resetPool !== null} onOpenChange={(open) => !resetting && !open && setResetPool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset counter?</DialogTitle>
            <DialogDescription>
              This will zero the current month's {resetPool} counter for this organization. An audit entry will be created. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPool(null)} disabled={resetting}>Cancel</Button>
            <Button onClick={handleResetCounter} disabled={resetting}>
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverrideField({
  label,
  tierDefault,
  enabled,
  onEnabledChange,
  disabled,
  children,
}: {
  label: string;
  tierDefault: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-muted pl-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{label}</Label>
          <p className="text-xs text-muted-foreground">Tier default: {tierDefault}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
      </div>
      {enabled && <div>{children}</div>}
    </div>
  );
}
