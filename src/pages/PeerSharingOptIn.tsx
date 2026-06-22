import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PtpSharingControls, {
  PtpAudienceKey,
  PtpAudienceContent,
  PtpContentGroup,
} from "@/components/sharing/PtpSharingControls";

const DEFAULT_CONTENT: PtpAudienceContent = { scores: true, interpretation: true, impact: true };

const PeerSharingOptIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [saving, setSaving] = useState(false);

  const [master, setMaster] = useState(true);
  const [audiences, setAudiences] = useState<Record<PtpAudienceKey, boolean>>({
    company_admin: false,
    supervisor: false,
    team: false,
    organization: false,
    direct_reports: false,
  });
  const [content, setContent] = useState<Partial<Record<PtpAudienceKey, PtpAudienceContent>>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("org_users_public")
        .select("id")
        .eq("supervisor_user_id", user.id)
        .limit(1);
      setHasDirectReports(!!data && data.length > 0);
    })();
  }, [user]);

  const handleContentChange = (audience: PtpAudienceKey, group: PtpContentGroup, v: boolean) => {
    setContent((prev) => {
      const current = prev[audience] ?? DEFAULT_CONTENT;
      return { ...prev, [audience]: { ...current, [group]: v } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const params: Record<string, boolean> = {};
    (Object.keys(audiences) as PtpAudienceKey[]).forEach((k) => {
      if (k === "direct_reports" && !hasDirectReports) return;
      params[`p_share_ptp_with_${k}`] = audiences[k];
    });
    const { error: prefsErr } = await (supabase as any).rpc("sharing_preferences_upsert", params);
    if (prefsErr) {
      setSaving(false);
      toast.error("Failed to save preferences");
      return;
    }

    const rows = master
      ? []
      : (Object.keys(audiences) as PtpAudienceKey[])
          .filter((k) => audiences[k] && (k !== "direct_reports" || hasDirectReports))
          .map((k) => {
            const t = content[k] ?? DEFAULT_CONTENT;
            return {
              audience: k,
              share_scores: t.scores,
              share_interpretation: t.interpretation,
              share_impact: t.impact,
            };
          });

    const { error: contentErr } = await (supabase as any).rpc("ptp_sharing_content_upsert", {
      p_share_ptp_full: master,
      p_rows: rows,
    });
    setSaving(false);
    if (contentErr) {
      toast.error("Failed to save content preferences");
      return;
    }
    navigate("/dashboard");
  };

  const handleSkip = async () => {
    await (supabase as any).rpc("sharing_preferences_upsert", {});
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">Share your PTP results with your team?</CardTitle>
          <CardDescription className="text-base leading-relaxed pt-2">
            Sharing your PTP with your team helps them understand your communication style and reduces friction in collaboration. You can change these preferences anytime from Privacy settings. NAI and HSS results are never shared through these toggles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PtpSharingControls
            master={master}
            onMasterChange={setMaster}
            audiences={audiences}
            onAudienceChange={(key, v) => setAudiences((p) => ({ ...p, [key]: v }))}
            content={content}
            onContentChange={handleContentChange}
            hasDirectReports={hasDirectReports}
          />

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

