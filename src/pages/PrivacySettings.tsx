import { useEffect, useState, useCallback, useRef } from "react";
import { useAiUsage } from "@/hooks/useAiUsage";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Lock, UserCircle, Pencil, MessageSquare, Users2, Inbox, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import PtpSharingControls, {
  PtpAudienceKey,
  PtpAudienceContent,
  PtpContentGroup,
} from "@/components/sharing/PtpSharingControls";

const DEFAULT_PTP_CONTENT: PtpAudienceContent = { scores: true, interpretation: true, impact: true };

type PermissionLevel = "score_summary" | "full_results" | "full_results_with_history" | "participation_only";

interface PermRow {
  id?: string;
  enabled: boolean;
  level: PermissionLevel;
}

interface DemoData {
  id: string;
  consent_granted_at: string | null;
  consent_withdrawn_at: string | null;
  role_in_org: string | null;
  industry: string | null;
  org_size: string | null;
  years_experience: string | null;
  age_range: string | null;
  gender_identity: string | null;
  national_origin: string | null;
}

const LEVEL_OPTIONS_STANDARD: { value: PermissionLevel; label: string }[] = [
  { value: "score_summary", label: "Scores only" },
  { value: "full_results", label: "Full results including narrative" },
];

const DEMO_FIELDS: { key: keyof DemoData; label: string }[] = [
  { key: "role_in_org", label: "Role in Organization" },
  { key: "industry", label: "Industry" },
  { key: "org_size", label: "Organization Size" },
  { key: "years_experience", label: "Years of Experience" },
  { key: "age_range", label: "Age Range" },
  { key: "gender_identity", label: "Gender Identity" },
  { key: "national_origin", label: "National Origin" },
];

const CORPORATE_ROLES = ["corporate_employee", "company_admin", "org_admin", "brainwise_super_admin"];

type PeerKey = "company_admin" | "supervisor" | "team" | "organization" | "direct_reports";

interface PeerPrefs {
  share_ptp_with_company_admin: boolean;
  share_ptp_with_supervisor: boolean;
  share_ptp_with_team: boolean;
  share_ptp_with_organization: boolean;
  share_ptp_with_direct_reports: boolean;
}

const PEER_TOGGLES: { key: PeerKey; field: keyof PeerPrefs; title: string; description: string }[] = [
  { key: "company_admin", field: "share_ptp_with_company_admin", title: "Share my PTP with my Company Admin", description: "HR and admin roles in your organization can view your PTP results." },
  { key: "supervisor", field: "share_ptp_with_supervisor", title: "Share my PTP with my Supervisor", description: "Your direct supervisor can view your PTP results." },
  { key: "team", field: "share_ptp_with_team", title: "Share my PTP with my Team", description: "Peers who share your supervisor can view your PTP results." },
  { key: "organization", field: "share_ptp_with_organization", title: "Share my PTP with my Organization", description: "Everyone in your organization can view your PTP results." },
  { key: "direct_reports", field: "share_ptp_with_direct_reports", title: "Share my PTP with my Direct Reports", description: "People who report to you can view your PTP results." },
];

export default function PrivacySettings() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { usage, fetchUsage } = useAiUsage();
  const [userTier, setUserTier] = useState("base");

  // Coach permission state (only remaining toggle from old data-sharing model)
  const [coach, setCoach] = useState<PermRow>({ enabled: false, level: "score_summary" });
  const [coachId, setCoachId] = useState<string | null>(null);
  const coachIdRef = useRef<string | null>(null);

  const [accountType, setAccountType] = useState<string | null>(null);
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [peerPrefs, setPeerPrefs] = useState<PeerPrefs>({
    share_ptp_with_company_admin: false,
    share_ptp_with_supervisor: false,
    share_ptp_with_team: false,
    share_ptp_with_organization: false,
    share_ptp_with_direct_reports: false,
  });
  const [pendingReceivedCount, setPendingReceivedCount] = useState(0);
  const [ptpMaster, setPtpMaster] = useState(true);
  const [ptpContent, setPtpContent] = useState<Partial<Record<PtpAudienceKey, PtpAudienceContent>>>({});

  const [hasPtp, setHasPtp] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharingBusy, setSharingBusy] = useState(false);
  const [myShares, setMyShares] = useState<{ share_id: string; viewer_user_id: string; viewer_name: string | null; viewer_email: string | null; created_at: string }[]>([]);

  const [demo, setDemo] = useState<DemoData | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const hasCoach = coachId !== null;
  const hasConsent = demo !== null && demo.consent_granted_at !== null && demo.consent_withdrawn_at === null;
  const isCorporate = accountType !== null && CORPORATE_ROLES.includes(accountType);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Coach association
      const { data: cc } = await supabase
        .from("coach_clients_client_view")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .limit(1);
      if (cc && cc.length > 0) {
        setCoachId(cc[0].coach_user_id);
        coachIdRef.current = cc[0].coach_user_id;
      }

      // User row: organization, share_results_with_coach, account_type
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id, share_results_with_coach, account_type")
        .eq("id", user.id)
        .single();
      if (userData) {
        setCoach(prev => ({ ...prev, enabled: userData.share_results_with_coach ?? false }));
        setAccountType(userData.account_type);
      }

      const { data: ptpRows } = await supabase
        .from("assessment_results")
        .select("id")
        .eq("user_id", user.id)
        .eq("instrument_id", "INST-001")
        .limit(1);
      setHasPtp(!!ptpRows && ptpRows.length > 0);

      const { data: sharesData } = await (supabase as any).rpc("list_my_ptp_shares");
      if (sharesData?.shares) setMyShares(sharesData.shares);



      // Existing coach permission row
      if (cc && cc.length > 0) {
        const { data: perms } = await supabase
          .from("permissions")
          .select("*")
          .eq("owner_user_id", user.id)
          .eq("viewer_user_id", cc[0].coach_user_id);
        if (perms && perms.length > 0) {
          const p = perms[0];
          setCoach({ id: p.id, enabled: true, level: (p.permission_level || "score_summary") as PermissionLevel });
        }
      }

      // Corporate-only loads
      if (userData?.account_type && CORPORATE_ROLES.includes(userData.account_type)) {
        // Sharing preferences
        const { data: prefs } = await (supabase as any)
          .from("sharing_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (prefs) {
          setPeerPrefs({
            share_ptp_with_company_admin: !!prefs.share_ptp_with_company_admin,
            share_ptp_with_supervisor: !!prefs.share_ptp_with_supervisor,
            share_ptp_with_team: !!prefs.share_ptp_with_team,
            share_ptp_with_organization: !!prefs.share_ptp_with_organization,
            share_ptp_with_direct_reports: !!prefs.share_ptp_with_direct_reports,
          });
        }

        // Direct reports check
        const { data: reports } = await supabase
          .from("org_users_public")
          .select("id")
          .eq("supervisor_user_id", user.id)
          .limit(1);
        setHasDirectReports(!!reports && reports.length > 0);

        // Pending peer access requests count
        const { count } = await (supabase as any)
          .from("peer_access_requests")
          .select("id", { count: "exact", head: true })
          .eq("target_user_id", user.id)
          .eq("status", "pending");
        setPendingReceivedCount(count || 0);
      }

      // Demographics
      const { data: demoData } = await supabase
        .from("user_demographics")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (demoData) setDemo(demoData as DemoData);

      // AI tier
      const { data: tierData } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      const t = tierData?.subscription_tier || "base";
      setUserTier(t);
      await fetchUsage(t);
    };

    load();
  }, [user, fetchUsage]);

  const showSaved = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  };

  const upsertPermission = useCallback(async (
    viewerUserId: string | null,
    viewerOrgId: string | null,
    level: PermissionLevel,
    existingId?: string,
  ) => {
    if (!user) return null;
    if (existingId) {
      const { data } = await supabase
        .from("permissions")
        .update({ permission_level: level })
        .eq("id", existingId)
        .select("id")
        .single();
      return data?.id || existingId;
    }
    const { data } = await supabase
      .from("permissions")
      .insert({
        owner_user_id: user.id,
        viewer_user_id: viewerUserId,
        viewer_organization_id: viewerOrgId,
        permission_level: level,
      })
      .select("id")
      .single();
    return data?.id || null;
  }, [user]);

  const deletePermission = useCallback(async (id: string) => {
    await supabase.from("permissions").delete().eq("id", id);
  }, []);

  const handleCoachToggle = async () => {
    const newEnabled = !coach.enabled;
    const resolvedViewerUserId = coachIdRef.current;
    if (newEnabled) {
      const id = await upsertPermission(resolvedViewerUserId, null, coach.level, coach.id);
      setCoach({ ...coach, enabled: true, id: id || coach.id });
    } else if (coach.id) {
      await deletePermission(coach.id);
      setCoach({ ...coach, enabled: false });
    }
    if (user) {
      await supabase.from("users").update({ share_results_with_coach: newEnabled }).eq("id", user.id);
    }
    showSaved("coach");
  };

  const handleCoachLevelChange = async (newLevel: PermissionLevel) => {
    setCoach({ ...coach, level: newLevel });
    if (coach.enabled) {
      await upsertPermission(coachIdRef.current, null, newLevel, coach.id);
      showSaved("coach");
    }
  };

  const handlePeerToggle = async (key: PeerKey, field: keyof PeerPrefs) => {
    const newValue = !peerPrefs[field];
    const previous = peerPrefs[field];
    setPeerPrefs((p) => ({ ...p, [field]: newValue }));
    const param: Record<string, boolean> = {};
    param[`p_${field}`] = newValue;
    const { error } = await (supabase as any).rpc("sharing_preferences_upsert", param);
    if (error) {
      toast.error("Failed to save");
      setPeerPrefs((p) => ({ ...p, [field]: previous }));
      return;
    }
    showSaved(`peer_${key}`);
  };

  const loadMyShares = useCallback(async () => {
    const { data } = await (supabase as any).rpc("list_my_ptp_shares");
    if (data?.shares) setMyShares(data.shares);
  }, []);

  const handleShare = async () => {
    const email = shareEmail.trim();
    if (!email) return;
    setSharingBusy(true);
    const { data, error } = await (supabase as any).rpc("share_ptp_results", { p_target_email: email });
    setSharingBusy(false);
    if (error) {
      if ((error.message || "").includes("rate_limited")) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else {
        toast.error("Could not share results. Please try again.");
      }
      return;
    }
    if (!data?.found) { toast.error("No account exists with that email address."); return; }
    if (data.status === "self") { toast.error("You can't share results with yourself."); return; }
    if (data.status === "already_shared") {
      toast.info(`You're already sharing your results with ${data.viewer_name || "that person"}.`);
      return;
    }
    if (data.status === "shared") {
      toast.success(`Now sharing your PTP results with ${data.viewer_name || "that person"}.`);
      setShareEmail("");
      loadMyShares();
    }
  };

  const handleRevokeShare = async (viewerUserId: string, viewerName: string | null) => {
    const { data, error } = await (supabase as any).rpc("revoke_ptp_share", { p_viewer_user_id: viewerUserId });
    if (error || !data?.revoked) { toast.error("Could not revoke access. Please try again."); return; }
    toast.success(`Stopped sharing with ${viewerName || "that person"}.`);
    setMyShares((prev) => prev.filter((s) => s.viewer_user_id !== viewerUserId));
  };



  const handleWithdrawConsent = async () => {
    if (!user || !demo) return;
    setSaving(true);
    await supabase.from("user_demographics").update({
      consent_withdrawn_at: new Date().toISOString(),
      role_in_org: null,
      industry: null,
      org_size: null,
      years_experience: null,
      age_range: null,
      gender_identity: null,
      national_origin: null,
      racial_ethnic_identity: null,
    }).eq("user_id", user.id);

    setDemo({
      ...demo,
      consent_withdrawn_at: new Date().toISOString(),
      role_in_org: null, industry: null, org_size: null,
      years_experience: null, age_range: null, gender_identity: null,
      national_origin: null,
    });
    setSaving(false);
    toast.success("Demographic data consent withdrawn and data cleared.");
  };

  const handleFieldSave = async (fieldKey: string, value: string) => {
    if (!user) return;
    setSaving(true);
    const updateObj: Record<string, string | null> = {};
    updateObj[fieldKey] = value || null;
    await supabase.from("user_demographics").update(updateObj as any).eq("user_id", user.id);
    if (demo) setDemo({ ...demo, [fieldKey]: value || null });
    setEditingField(null);
    setSaving(false);
    toast.success("Field updated.");
  };

  const visiblePeerToggles = PEER_TOGGLES.filter(t => t.key !== "direct_reports" || hasDirectReports);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Control who can see your assessment data</p>
      </div>

      {/* Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            Your results are private by default. You are always in control of who can see your data. You can change these settings at any time.
          </p>
        </CardContent>
      </Card>

      {/* Data Sharing card — Coach only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" /> Data Sharing
          </CardTitle>
          <CardDescription>Choose who can view your assessment results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`p-4 rounded-lg border ${!hasCoach ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">My Coach</p>
                  <p className="text-sm text-muted-foreground">Allow your assigned coach to view your results</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedKey === "coach" && (
                  <Badge variant="secondary" className="text-xs animate-in fade-in">Saved</Badge>
                )}
                <Switch
                  checked={coach.enabled}
                  disabled={!hasCoach}
                  onCheckedChange={handleCoachToggle}
                />
              </div>
            </div>
            {!hasCoach && (
              <p className="text-xs text-muted-foreground mt-2 italic">Not applicable to your account</p>
            )}
            {hasCoach && coach.enabled && (
              <div className="mt-3 ml-9">
                <Label className="text-xs text-muted-foreground">Sharing level</Label>
                <Select
                  value={coach.level}
                  onValueChange={(v) => handleCoachLevelChange(v as PermissionLevel)}
                >
                  <SelectTrigger className="w-full max-w-xs mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS_STANDARD.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasPtp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Share My PTP Results
            </CardTitle>
            <CardDescription>
              Share your full PTP results with another BrainWise account holder by email. They'll be notified and can view your report when they sign in. You can revoke access at any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="ptp-share-email" className="text-sm">Recipient email</Label>
                <Input
                  id="ptp-share-email"
                  type="email"
                  placeholder="name@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleShare} disabled={sharingBusy || !shareEmail.trim()}>
                {sharingBusy ? "Sharing..." : "Share"}
              </Button>
            </div>

            {myShares.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Currently shared with</p>
                {myShares.map((s) => (
                  <div key={s.share_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.viewer_name || s.viewer_email}</p>
                      {s.viewer_email && s.viewer_name && (
                        <p className="text-xs text-muted-foreground">{s.viewer_email}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRevokeShare(s.viewer_user_id, s.viewer_name)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Corporate Peer Sharing */}

      {isCorporate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users2 className="h-4 w-4" /> Corporate Peer Sharing
            </CardTitle>
            <CardDescription>
              These settings apply only to your PTP (Personal Threat Profile) results. Your NAI and HSS results are never shared with peers. Your AIRSA results are always visible to your direct supervisor and company admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visiblePeerToggles.map(({ key, field, title, description }) => (
              <div key={key} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {savedKey === `peer_${key}` && (
                      <Badge variant="secondary" className="text-xs animate-in fade-in">Saved</Badge>
                    )}
                    <Switch
                      checked={peerPrefs[field]}
                      onCheckedChange={() => handlePeerToggle(key, field)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Peer Access Requests */}
      {isCorporate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Peer Access Requests
            </CardTitle>
            <CardDescription>Manage requests from peers asking to view your PTP results.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Pending requests</span>
              <Badge variant={pendingReceivedCount > 0 ? "default" : "secondary"}>{pendingReceivedCount}</Badge>
            </div>
            <Button variant="outline" onClick={() => navigate("/settings/sharing-requests")}>
              Manage Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Demographic section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Background Information</CardTitle>
          <CardDescription>Optional demographic data used for aggregate research</CardDescription>
        </CardHeader>
        <CardContent>
          {hasConsent ? (
            <div className="space-y-4">
              {DEMO_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {(demo as unknown as Record<string, unknown>)[key] as string || "Not provided"}
                    </p>
                  </div>
                  {editingField === key ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded px-2 py-1 text-sm w-40"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleFieldSave(key, editValue)} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingField(key); setEditValue(((demo as unknown as Record<string, unknown>)[key] as string) || ""); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              ))}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mt-4">
                    Withdraw demographic data consent
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Consent</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your demographic data (role, industry, organization size, experience, age, gender, and national origin). Your assessment results will not be affected. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleWithdrawConsent} disabled={saving}>
                      Withdraw & Delete Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                You previously skipped optional background information. Would you like to add it?
              </p>
              <Button variant="outline" onClick={() => navigate("/demographic-consent")}>
                Add Background Information
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Usage Section */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> AI Usage
            </CardTitle>
            <CardDescription>
              {usage.subscription_active === false
                ? "Your one-time AI chat message balance"
                : "Your monthly AI chat message usage"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage.subscription_active !== false && (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">
                      {usage.current_count} of {usage.limit} messages used
                    </span>
                    <span className="text-muted-foreground capitalize">{userTier} tier</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    {(() => {
                      const pct = usage.limit > 0 ? Math.round((usage.current_count / usage.limit) * 100) : 0;
                      let color = "bg-[var(--bw-forest)]";
                      if (pct >= 80) color = "bg-[var(--bw-orange)]";
                      else if (pct >= 50) color = "bg-[var(--bw-amber)]";
                      return <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />;
                    })()}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </>
            )}
            {(usage.credit_balance ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                {usage.credit_balance} one-time message{usage.credit_balance === 1 ? "" : "s"} remaining
              </p>
            )}
            {usage.subscription_active !== false && userTier === "base" && (
              <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
                Upgrade to Premium for more messages
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
