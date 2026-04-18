import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { toast } from "sonner";

interface PeerPrefs {
  share_ptp_with_company_admin: boolean;
  share_ptp_with_supervisor: boolean;
  share_ptp_with_team: boolean;
  share_ptp_with_organization: boolean;
  share_ptp_with_direct_reports: boolean;
}

const TOGGLES: { field: keyof PeerPrefs; title: string; description: string; directReportsOnly?: boolean }[] = [
  { field: "share_ptp_with_company_admin", title: "Share with my Company Admin", description: "HR and admin roles in your organization can view your PTP results." },
  { field: "share_ptp_with_supervisor", title: "Share with my Supervisor", description: "Your direct supervisor can view your PTP results." },
  { field: "share_ptp_with_team", title: "Share with my Team", description: "Peers who share your supervisor can view your PTP results." },
  { field: "share_ptp_with_organization", title: "Share with my Organization", description: "Everyone in your organization can view your PTP results." },
  { field: "share_ptp_with_direct_reports", title: "Share with my Direct Reports", description: "People who report to you can view your PTP results.", directReportsOnly: true },
];

const PeerSharingOptIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<PeerPrefs>({
    share_ptp_with_company_admin: false,
    share_ptp_with_supervisor: false,
    share_ptp_with_team: false,
    share_ptp_with_organization: false,
    share_ptp_with_direct_reports: false,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("supervisor_user_id", user.id)
        .limit(1);
      setHasDirectReports(!!data && data.length > 0);
    })();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const params: Record<string, boolean> = {};
    (Object.keys(prefs) as (keyof PeerPrefs)[]).forEach((k) => {
      if (k === "share_ptp_with_direct_reports" && !hasDirectReports) return;
      params[`p_${k}`] = prefs[k];
    });
    const { error } = await (supabase as any).rpc("sharing_preferences_upsert", params);
    setSaving(false);
    if (error) {
      toast.error("Failed to save preferences");
      return;
    }
    navigate("/dashboard");
  };

  const handleSkip = () => navigate("/dashboard");

  const visibleToggles = TOGGLES.filter(t => !t.directReportsOnly || hasDirectReports);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl">Share your PTP results with your team?</CardTitle>
          <CardDescription className="text-base leading-relaxed pt-2">
            Sharing your PTP with your team helps them understand your communication style and reduces friction in collaboration. You can change these preferences anytime from Privacy settings. NAI and HSS results are never shared through these toggles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleToggles.map(({ field, title, description }) => (
            <div key={field} className="p-3 rounded-lg border flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={prefs[field]}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [field]: v }))}
              />
            </div>
          ))}

          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save preferences"}
            </Button>
            <Button variant="outline" onClick={handleSkip} className="w-full">
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeerSharingOptIn;
