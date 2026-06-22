import { Switch } from "@/components/ui/switch";

export type PtpAudienceKey =
  | "company_admin"
  | "supervisor"
  | "team"
  | "organization"
  | "direct_reports";

export type PtpContentGroup = "scores" | "interpretation" | "impact";

export type PtpAudienceContent = {
  scores: boolean;
  interpretation: boolean;
  impact: boolean;
};

interface Props {
  master: boolean;
  onMasterChange: (v: boolean) => void;
  audiences: Record<PtpAudienceKey, boolean>;
  onAudienceChange: (key: PtpAudienceKey, v: boolean) => void;
  content: Partial<Record<PtpAudienceKey, PtpAudienceContent>>;
  onContentChange: (audience: PtpAudienceKey, group: PtpContentGroup, v: boolean) => void;
  hasDirectReports: boolean;
}

const AUDIENCES: { key: PtpAudienceKey; title: string; description: string }[] = [
  { key: "company_admin", title: "Share with my Company Admin", description: "HR and admin roles in your organization can view your PTP results." },
  { key: "supervisor", title: "Share with my Supervisor", description: "Your direct supervisor can view your PTP results." },
  { key: "team", title: "Share with my Team", description: "Peers who share your supervisor can view your PTP results." },
  { key: "organization", title: "Share with my Organization", description: "Everyone in your organization can view your PTP results." },
  { key: "direct_reports", title: "Share with my Direct Reports", description: "People who report to you can view your PTP results." },
];

const GROUPS: { key: PtpContentGroup; title: string; description: string }[] = [
  { key: "scores", title: "Scores", description: "Dimension and facet scores" },
  { key: "interpretation", title: "Interpretation", description: "AI profile overview, what-this-means, dimension highlights, suggested next steps" },
  { key: "impact", title: "Impact statements", description: "How your profile may affect you and others" },
];

const DEFAULT_CONTENT: PtpAudienceContent = { scores: true, interpretation: true, impact: true };

export default function PtpSharingControls({
  master,
  onMasterChange,
  audiences,
  onAudienceChange,
  content,
  onContentChange,
  hasDirectReports,
}: Props) {
  const visible = AUDIENCES.filter((a) => a.key !== "direct_reports" || hasDirectReports);

  return (
    <div className="space-y-3">
      {/* Master */}
      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-foreground">Share my full PTP report</p>
            <p className="text-sm text-muted-foreground">
              When on, anyone you share with sees your complete report. Turn it off to choose what each group can see.
            </p>
          </div>
          <Switch checked={master} onCheckedChange={onMasterChange} />
        </div>
      </div>

      {visible.map(({ key, title, description }) => {
        const audienceOn = !!audiences[key];
        const triplet = content[key] ?? DEFAULT_CONTENT;
        return (
          <div key={key} className="p-4 rounded-lg border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={audienceOn}
                onCheckedChange={(v) => onAudienceChange(key, v)}
              />
            </div>
            {!master && audienceOn && (
              <div className="mt-3 ml-4 pl-4 border-l space-y-2">
                {GROUPS.map((g) => (
                  <div key={g.key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{g.title}</p>
                      <p className="text-xs text-muted-foreground">{g.description}</p>
                    </div>
                    <Switch
                      checked={!!triplet[g.key]}
                      onCheckedChange={(v) => onContentChange(key, g.key, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
