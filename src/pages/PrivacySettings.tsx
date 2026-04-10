import { useEffect, useState, useCallback } from "react";
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
import { Shield, Lock, Eye, Users, Building2, UserCircle, Pencil, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

const LEVEL_OPTIONS_ORG: { value: PermissionLevel; label: string }[] = [
  { value: "participation_only", label: "Participation status only" },
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

export default function PrivacySettings() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { usage, fetchUsage } = useAiUsage();
  const [userTier, setUserTier] = useState("base");

  // Permission state for each target type
  const [coach, setCoach] = useState<PermRow>({ enabled: false, level: "score_summary" });
  const [manager, setManager] = useState<PermRow>({ enabled: false, level: "score_summary" });
  const [team, setTeam] = useState<PermRow>({ enabled: false, level: "score_summary" });
  const [org, setOrg] = useState<PermRow>({ enabled: false, level: "participation_only" });

  const [coachId, setCoachId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  const [demo, setDemo] = useState<DemoData | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const hasCoach = coachId !== null;
  const hasOrg = orgId !== null;
  const hasManager = managerId !== null;
  const hasTeam = teamId !== null;
  const hasConsent = demo !== null && demo.consent_granted_at !== null && demo.consent_withdrawn_at === null;

  // Load related IDs and existing permissions
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get coach association
      const { data: cc } = await supabase
        .from("coach_clients")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .limit(1);
      if (cc && cc.length > 0) setCoachId(cc[0].coach_user_id);

      // Get user's org and team info + share_results_with_coach
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id, share_results_with_coach")
        .eq("id", user.id)
        .single();
      if (userData) {
        setCoach(prev => ({ ...prev, enabled: userData.share_results_with_coach ?? false }));
      }
      if (userData?.organization_id) {
        setOrgId(userData.organization_id);
        // Get team membership
        const { data: tm } = await supabase
          .from("team_members")
          .select("team_id, teams(manager_user_id)")
          .eq("user_id", user.id)
          .limit(1);
        if (tm && tm.length > 0) {
          setTeamId(tm[0].team_id);
          const teamData = tm[0].teams as unknown as { manager_user_id: string | null };
          if (teamData?.manager_user_id) setManagerId(teamData.manager_user_id);
        }
      }

      // Load existing permissions
      const { data: perms } = await supabase
        .from("permissions")
        .select("*")
        .eq("owner_user_id", user.id);

      if (perms) {
        for (const p of perms) {
          const level = (p.permission_level || "score_summary") as PermissionLevel;
          if (p.viewer_user_id && cc && cc.length > 0 && p.viewer_user_id === cc[0].coach_user_id) {
            setCoach({ id: p.id, enabled: true, level });
          } else if (p.viewer_user_id && p.viewer_user_id === managerId) {
            setManager({ id: p.id, enabled: true, level });
          } else if (p.viewer_organization_id && userData?.organization_id && p.viewer_organization_id === userData.organization_id) {
            setOrg({ id: p.id, enabled: true, level });
          }
          // Team permissions stored as org-level with a note; simplified here
        }
      }

      // Load demographics
      const { data: demoData } = await supabase
        .from("user_demographics")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (demoData) setDemo(demoData as DemoData);

      // Fetch AI usage + tier
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

  const handleToggle = async (
    key: string,
    current: PermRow,
    setter: React.Dispatch<React.SetStateAction<PermRow>>,
    viewerUserId: string | null,
    viewerOrgId: string | null,
  ) => {
    const newEnabled = !current.enabled;
    if (newEnabled) {
      const id = await upsertPermission(viewerUserId, viewerOrgId, current.level, current.id);
      setter({ ...current, enabled: true, id: id || current.id });
    } else if (current.id) {
      await deletePermission(current.id);
      setter({ ...current, enabled: false });
    }
    // Sync share_results_with_coach column when toggling coach
    if (key === "coach" && user) {
      await supabase
        .from("users")
        .update({ share_results_with_coach: newEnabled })
        .eq("id", user.id);
    }
    showSaved(key);
  };

  const handleLevelChange = async (
    key: string,
    current: PermRow,
    setter: React.Dispatch<React.SetStateAction<PermRow>>,
    viewerUserId: string | null,
    viewerOrgId: string | null,
    newLevel: PermissionLevel,
  ) => {
    setter({ ...current, level: newLevel });
    if (current.enabled) {
      await upsertPermission(viewerUserId, viewerOrgId, newLevel, current.id);
      showSaved(key);
    }
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
    await supabase.from("user_demographics").update(
      updateObj as any
    ).eq("user_id", user.id);

    if (demo) setDemo({ ...demo, [fieldKey]: value || null });
    setEditingField(null);
    setSaving(false);
    toast.success("Field updated.");
  };

  const renderToggleRow = (
    key: string,
    icon: React.ReactNode,
    title: string,
    description: string,
    current: PermRow,
    setter: React.Dispatch<React.SetStateAction<PermRow>>,
    viewerUserId: string | null,
    viewerOrgId: string | null,
    applicable: boolean,
    levelOptions: { value: PermissionLevel; label: string }[],
  ) => (
    <div key={key} className={`p-4 rounded-lg border ${!applicable ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedKey === key && (
            <Badge variant="secondary" className="text-xs animate-in fade-in">Saved</Badge>
          )}
          <Switch
            checked={current.enabled}
            disabled={!applicable}
            onCheckedChange={() => handleToggle(key, current, setter, viewerUserId, viewerOrgId)}
          />
        </div>
      </div>
      {!applicable && (
        <p className="text-xs text-muted-foreground mt-2 italic">Not applicable to your account</p>
      )}
      {applicable && current.enabled && (
        <div className="mt-3 ml-9">
          <Label className="text-xs text-muted-foreground">Sharing level</Label>
          <Select
            value={current.level}
            onValueChange={(v) => handleLevelChange(key, current, setter, viewerUserId, viewerOrgId, v as PermissionLevel)}
          >
            <SelectTrigger className="w-full max-w-xs mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

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

      {/* Permission toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" /> Data Sharing
          </CardTitle>
          <CardDescription>Choose who can view your assessment results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderToggleRow(
            "coach",
            <UserCircle className="h-5 w-5 text-muted-foreground" />,
            "My Coach",
            "Allow your assigned coach to view your results",
            coach, setCoach,
            coachId, null,
            hasCoach,
            LEVEL_OPTIONS_STANDARD,
          )}
          {renderToggleRow(
            "manager",
            <Eye className="h-5 w-5 text-muted-foreground" />,
            "My Manager",
            "Allow your team manager to view your results",
            manager, setManager,
            managerId, null,
            hasManager,
            LEVEL_OPTIONS_STANDARD,
          )}
          {renderToggleRow(
            "team",
            <Users className="h-5 w-5 text-muted-foreground" />,
            "My Team",
            "Allow team members to view your results",
            team, setTeam,
            null, orgId,
            hasTeam,
            LEVEL_OPTIONS_STANDARD,
          )}
          {renderToggleRow(
            "org",
            <Building2 className="h-5 w-5 text-muted-foreground" />,
            "My Organization",
            "Allow your organization to view your results",
            org, setOrg,
            null, orgId,
            hasOrg,
            LEVEL_OPTIONS_ORG,
          )}
        </CardContent>
      </Card>

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
            <CardDescription>Your monthly AI chat message usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  let color = "bg-accent";
                  if (pct >= 80) color = "bg-[hsl(30,90%,50%)]";
                  else if (pct >= 50) color = "bg-[hsl(45,90%,50%)]";
                  return <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />;
                })()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {userTier === "base" && (
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
