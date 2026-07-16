import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2 } from "lucide-react";

export interface PdfSections {
  profileOverview: boolean;
  drivingFacetScores: boolean;
  profileOverviewNarrative: boolean;
  ptpBrainOverview: boolean;
  dimensionHighlights: boolean;
  drivingFacetInsightsElevated: boolean;
  drivingFacetInsightsSuppressed: boolean;
  fullFacetCharts: boolean;
  crossAssessmentConnections: boolean;
  assessmentResponses: boolean;
  whatThisMeans: boolean;
  actionPlan: boolean;
  assessmentResponsesIncludeInsights: boolean;
}

export interface NaiPdfSectionsUi {
  profileOverview: boolean;
  profileOverviewNarrative: boolean;
  naiOverview: boolean;
  dimensionHighlights: boolean;
  patternAlert: boolean;
  individualResponses: boolean;
  cafesPtpMapping: boolean;
  crossAssessmentInterpretation: boolean;
  assessmentResponses: boolean;
}

export interface AirsaPdfSectionsUi {
  atAGlance: boolean;
  howToRead: boolean;
  profileOverview: boolean;
  domainHeatmap: boolean;
  whatThisMeans: boolean;
  actionPlan: boolean;
  lollipop: boolean;
  conversationGuide: boolean;
  topPriorities: boolean;
  crossInstrument: boolean;
  skillReference: boolean;
  methodology: boolean;
}

export interface TeamPdfSectionsUi {
  teamInThree: boolean;
  domains: boolean;
  shapeLegend: boolean;
  driving: boolean;
  drivingFacetCharts: boolean;
  communication: boolean;
  conflict: boolean;
  leadership: boolean;
  leaderBrief: boolean;
  fullMap: boolean;
  fullMapCharts: boolean;
  coach: boolean;
}

export interface PairedPdfSectionsUi {
  pairInThree: boolean;
  atAGlance: boolean;
  shapeLegend: boolean;
  driving: boolean;
  drivingFacetCharts: boolean;
  within: boolean;
  needs: boolean;
  communication: boolean;
  conflict: boolean;
  leaderActions: boolean;
  repair: boolean;
  intimacy: boolean;
  fullMap: boolean;
  fullMapCharts: boolean;
  coach: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrumentType: "PTP" | "NAI" | "AIRSA" | "TEAM" | "PAIRED" | "OTHER";
  isCoachView?: boolean;
  reportMode?: "work" | "personal" | "romantic";
  onExportPtp?: (sections: PdfSections) => Promise<void>;
  onExportNai?: (sections: NaiPdfSectionsUi) => Promise<void>;
  onExportAirsa?: (sections: AirsaPdfSectionsUi) => Promise<void>;
  onExportTeam?: (sections: TeamPdfSectionsUi) => Promise<void>;
  onExportPaired?: (sections: PairedPdfSectionsUi) => Promise<void>;
}

type SectionOption<K extends string> = {
  key: K;
  name: string;
  description: string;
  coachOnly?: boolean;
  romanticOnly?: boolean;
  needsLeadership?: boolean;
  needsLeaderActions?: boolean;
};

type SectionGroup<K extends string> = {
  title: string;
  options: SectionOption<K>[];
};

const PTP_GROUPS: SectionGroup<keyof PdfSections>[] = [
  {
    title: "Profile sections",
    options: [
      { key: "ptpBrainOverview", name: "PTP and Brain Overview", description: "Introduction to the PTP framework and brain context" },
      { key: "profileOverview", name: "Profile Overview", description: "Dimension scores summary and highlights" },
      { key: "profileOverviewNarrative", name: "Profile Overview Narrative", description: "AI-generated narrative interpreting your pattern" },
      { key: "whatThisMeans", name: "What does this mean to me?", description: "Personal implications drawn from your profile" },
      { key: "actionPlan", name: "Action Plan", description: "Targeted steps based on your driving facets" },
    ],
  },
  {
    title: "Dimension detail sections",
    options: [
      { key: "dimensionHighlights", name: "Dimension Highlights", description: "Per-dimension narrative and key facet contributors" },
      { key: "drivingFacetScores", name: "Driving Facet Scores", description: "Highest and lowest scoring facet tables" },
      { key: "drivingFacetInsightsElevated", name: "Driving Facet Insights — High Scoring Drivers", description: "Behavioral impacts of high scoring facets" },
      { key: "drivingFacetInsightsSuppressed", name: "Driving Facet Insights — Low Scoring Drivers", description: "Behavioral impacts of low scoring facets" },
      { key: "fullFacetCharts", name: "Full Facet Charts", description: "Bar charts of every assessed facet, grouped by All/Threat/Reward" },
    ],
  },
  {
    title: "Cross-cutting",
    options: [
      { key: "crossAssessmentConnections", name: "Cross-Assessment Connections", description: "How PTP patterns connect to NAI and HSS data" },
    ],
  },
  {
    title: "Raw data",
    options: [
      { key: "assessmentResponses", name: "Assessment Responses", description: "Your individual question scores" },
    ],
  },
];

const NAI_GROUPS: SectionGroup<keyof NaiPdfSectionsUi>[] = [
  {
    title: "Profile sections",
    options: [
      { key: "profileOverview", name: "Profile Overview", description: "Stat cards and dimension score cards" },
      { key: "profileOverviewNarrative", name: "Profile Overview Narrative", description: "AI-generated profile summary" },
      { key: "naiOverview", name: "NAI Overview", description: "Framework introduction" },
    ],
  },
  {
    title: "Dimension detail sections",
    options: [
      { key: "dimensionHighlights", name: "Dimension Highlights", description: "All 5 C.A.F.E.S. dimensions" },
      { key: "individualResponses", name: "Individual Responses That Warrant Attention", description: "Items scoring 75+" },
    ],
  },
  {
    title: "Cross-cutting sections",
    options: [
      { key: "patternAlert", name: "Pattern Alert", description: "Coach coaching guidance", coachOnly: true },
      { key: "cafesPtpMapping", name: "C.A.F.E.S.–PTP Mapping", description: "Coach coaching materials", coachOnly: true },
      { key: "crossAssessmentInterpretation", name: "Cross-Assessment Interpretation", description: "AI-generated analysis" },
    ],
  },
  {
    title: "Raw data",
    options: [
      { key: "assessmentResponses", name: "Assessment Responses", description: "All 25 questions and scores" },
    ],
  },
];

const AIRSA_GROUPS: SectionGroup<keyof AirsaPdfSectionsUi>[] = [
  {
    title: "Profile sections",
    options: [
      { key: "atAGlance", name: "At a glance", description: "Four metric cards" },
      { key: "howToRead", name: "How to read your results", description: "Framework introduction" },
      { key: "profileOverview", name: "Profile overview", description: "AI-generated summary" },
    ],
  },
  {
    title: "Skill detail sections",
    options: [
      { key: "domainHeatmap", name: "Domain heatmap", description: "Self vs manager by domain" },
      { key: "lollipop", name: "Skill-by-skill comparison", description: "All 24 skills, lollipop chart" },
      { key: "topPriorities", name: "Top 3 development priorities", description: "AI-generated priorities" },
    ],
  },
  {
    title: "Cross-cutting sections",
    options: [
      { key: "whatThisMeans", name: "What does this mean to me?", description: "AI-generated four-box analysis" },
      { key: "actionPlan", name: "Action plan", description: "AI-generated 7/30/90-day plan" },
      { key: "conversationGuide", name: "Conversation guide", description: "AI-generated three-card guide" },
      { key: "crossInstrument", name: "How this connects to your other assessments", description: "AI-generated cross-instrument analysis" },
    ],
  },
  {
    title: "Reference",
    options: [
      { key: "skillReference", name: "Skill reference list", description: "All 24 skills with definitions" },
      { key: "methodology", name: "Methodology", description: "Framework citations and disclaimers" },
    ],
  },
];

const PAIRED_GROUPS: SectionGroup<keyof PairedPdfSectionsUi>[] = [
  {
    title: "Overview",
    options: [
      { key: "pairInThree", name: "Your pair in three", description: "The whole report in 30 seconds" },
      { key: "atAGlance", name: "At a glance", description: "Radial + per-dimension agreement bars" },
      { key: "shapeLegend", name: "How to read the shapes", description: "Five pair-shape descriptions" },
    ],
  },
  {
    title: "Driving facets",
    options: [
      { key: "driving", name: "Driving facets", description: "Strengths and focus cards with actions" },
      { key: "drivingFacetCharts", name: "Driving facet distribution", description: "Per-facet distribution charts (A vs B dots) — larger file" },
    ],
  },
  {
    title: "How you show up",
    options: [
      { key: "within", name: "Within each person", description: "Two-column notes per person" },
      { key: "needs", name: "What each of you needs", description: "Two-column needs from each other" },
      { key: "communication", name: "Communication", description: "General, under pressure, avoiding conflict" },
      { key: "conflict", name: "Conflict", description: "Mitigate + promote healthy + read/counter-move" },
      { key: "repair", name: "Repair", description: "Overview, steps, per-person guidance" },
      { key: "intimacy", name: "Intimacy", description: "Overview and per-person guidance", romanticOnly: true },
    ],
  },
  {
    title: "The full map",
    options: [
      { key: "fullMap", name: "Full map (grouped list)", description: "All facets grouped by pair shape" },
      { key: "fullMapCharts", name: "Full map with distribution", description: "Per-facet distribution charts (A vs B dots) — larger file" },
    ],
  },
  {
    title: "Privileged",
    options: [
      { key: "coach", name: "For the coach or admin only", description: "Facilitation material", coachOnly: true },
    ],
  },
];

const TEAM_GROUPS: SectionGroup<keyof TeamPdfSectionsUi>[] = [
  {
    title: "Overview",
    options: [
      { key: "teamInThree", name: "Your team in three", description: "The whole report in 30 seconds" },
      { key: "domains", name: "Three domains at a glance", description: "Radial with mean/high/low + agreement bars" },
      { key: "shapeLegend", name: "How to read the shapes", description: "Five team-shape descriptions" },
    ],
  },
  {
    title: "Driving facets",
    options: [
      { key: "driving", name: "Driving facets", description: "Strengths and focus cards with actions" },
      { key: "drivingFacetCharts", name: "Driving facet distribution", description: "Per-facet distribution charts (member dots) — larger file" },
    ],
  },
  {
    title: "How the team shows up",
    options: [
      { key: "communication", name: "Communication", description: "General, under pressure, avoiding conflict" },
      { key: "conflict", name: "Conflict", description: "Summary + mitigate + promote healthy" },
      { key: "leaderBrief", name: "For the leader: the moves", description: "Driver / risk / move / owner + lean-on", coachOnly: true },
    ],
  },
  {
    title: "The full map",
    options: [
      { key: "fullMap", name: "Full map (grouped list)", description: "All facets grouped by team shape" },
      { key: "fullMapCharts", name: "Full map with distribution", description: "Per-facet distribution charts (member dots) — larger file" },
    ],
  },
  {
    title: "Privileged",
    options: [
      { key: "coach", name: "For the coach, org admin & super admin", description: "Facilitation material", coachOnly: true },
    ],
  },
];

export default function ExportPdfModal({
  open,
  onOpenChange,
  instrumentType,
  isCoachView = false,
  reportMode,
  onExportPtp,
  onExportNai,
  onExportAirsa,
  onExportTeam,
  onExportPaired,
}: Props) {
  const [ptpSections, setPtpSections] = useState<PdfSections>({
    profileOverview: true,
    drivingFacetScores: true,
    profileOverviewNarrative: true,
    ptpBrainOverview: true,
    dimensionHighlights: true,
    drivingFacetInsightsElevated: true,
    drivingFacetInsightsSuppressed: true,
    fullFacetCharts: true,
    crossAssessmentConnections: true,
    assessmentResponses: true,
    whatThisMeans: true,
    actionPlan: true,
    assessmentResponsesIncludeInsights: false,
  });

  const [naiSections, setNaiSections] = useState<NaiPdfSectionsUi>({
    profileOverview: true,
    profileOverviewNarrative: true,
    naiOverview: true,
    dimensionHighlights: true,
    patternAlert: true,
    individualResponses: true,
    cafesPtpMapping: true,
    crossAssessmentInterpretation: true,
    assessmentResponses: true,
  });

  const [airsaSections, setAirsaSections] = useState<AirsaPdfSectionsUi>({
    atAGlance: true,
    howToRead: true,
    profileOverview: true,
    domainHeatmap: true,
    whatThisMeans: true,
    actionPlan: true,
    lollipop: true,
    conversationGuide: true,
    topPriorities: true,
    crossInstrument: true,
    skillReference: true,
    methodology: true,
  });

  const [teamSections, setTeamSections] = useState<TeamPdfSectionsUi>({
    teamInThree: true,
    domains: true,
    shapeLegend: true,
    driving: true,
    drivingFacetCharts: false,
    communication: true,
    conflict: true,
    leaderBrief: true,
    fullMap: true,
    fullMapCharts: false,
    coach: true,
  });

  const [pairedSections, setPairedSections] = useState<PairedPdfSectionsUi>({
    pairInThree: true,
    atAGlance: true,
    shapeLegend: true,
    driving: true,
    drivingFacetCharts: false,
    within: true,
    needs: true,
    communication: true,
    conflict: true,
    repair: true,
    intimacy: true,
    fullMap: true,
    fullMapCharts: false,
    coach: true,
  });

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isCoachView) {
      setNaiSections((prev) => ({ ...prev, patternAlert: false, cafesPtpMapping: false }));
      setTeamSections((prev) => ({ ...prev, leaderBrief: false, coach: false }));
      setPairedSections((prev) => ({ ...prev, coach: false }));
    }
  }, [isCoachView]);

  useEffect(() => {
    if (instrumentType === "PAIRED" && reportMode !== "romantic") {
      setPairedSections((prev) => ({ ...prev, intimacy: false }));
    }
  }, [instrumentType, reportMode]);

  const isNai = instrumentType === "NAI";
  const isAirsa = instrumentType === "AIRSA";
  const isTeam = instrumentType === "TEAM";
  const isPaired = instrumentType === "PAIRED";

  const filterGroups = <K extends string>(groups: SectionGroup<K>[]): SectionGroup<K>[] =>
    groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            (!o.coachOnly || isCoachView) &&
            (!o.romanticOnly || reportMode === "romantic"),
        ),
      }))
      .filter((g) => g.options.length > 0);

  const visibleNaiGroups = useMemo(() => filterGroups(NAI_GROUPS), [isCoachView, reportMode]);
  const visiblePtpGroups = PTP_GROUPS;
  const visibleAirsaGroups = AIRSA_GROUPS;
  const visibleTeamGroups = useMemo(() => filterGroups(TEAM_GROUPS), [isCoachView, reportMode]);
  const visiblePairedGroups = useMemo(() => filterGroups(PAIRED_GROUPS), [isCoachView, reportMode]);

  const allSelected = isPaired
    ? visiblePairedGroups.every((g) => g.options.every((o) => pairedSections[o.key]))
    : isTeam
    ? visibleTeamGroups.every((g) => g.options.every((o) => teamSections[o.key]))
    : isAirsa
    ? visibleAirsaGroups.every((g) => g.options.every((o) => airsaSections[o.key]))
    : isNai
    ? visibleNaiGroups.every((g) => g.options.every((o) => naiSections[o.key]))
    : visiblePtpGroups.every((g) => g.options.every((o) => ptpSections[o.key]));

  const setAll = (value: boolean) => {
    if (isPaired) {
      setPairedSections((prev) => {
        const next = { ...prev };
        visiblePairedGroups.forEach((g) => g.options.forEach((o) => (next[o.key] = value)));
        return next;
      });
    } else if (isTeam) {
      setTeamSections((prev) => {
        const next = { ...prev };
        visibleTeamGroups.forEach((g) => g.options.forEach((o) => (next[o.key] = value)));
        return next;
      });
    } else if (isAirsa) {
      setAirsaSections((prev) => {
        const next = { ...prev };
        visibleAirsaGroups.forEach((g) => g.options.forEach((o) => (next[o.key] = value)));
        return next;
      });
    } else if (isNai) {
      setNaiSections((prev) => {
        const next = { ...prev };
        visibleNaiGroups.forEach((g) => g.options.forEach((o) => (next[o.key] = value)));
        return next;
      });
    } else {
      setPtpSections((prev) => {
        const next = { ...prev };
        visiblePtpGroups.forEach((g) => g.options.forEach((o) => (next[o.key] = value)));
        return next;
      });
    }
  };

  const togglePtp = (k: keyof PdfSections) => setPtpSections((p) => ({ ...p, [k]: !p[k] }));
  const toggleNai = (k: keyof NaiPdfSectionsUi) => setNaiSections((p) => ({ ...p, [k]: !p[k] }));
  const toggleAirsa = (k: keyof AirsaPdfSectionsUi) => setAirsaSections((p) => ({ ...p, [k]: !p[k] }));
  const toggleTeam = (k: keyof TeamPdfSectionsUi) => setTeamSections((p) => ({ ...p, [k]: !p[k] }));
  const togglePaired = (k: keyof PairedPdfSectionsUi) =>
    setPairedSections((p) => ({ ...p, [k]: !p[k] }));

  const handleExport = async () => {
    setExporting(true);
    try {
      if (isPaired && onExportPaired) await onExportPaired(pairedSections);
      else if (isTeam && onExportTeam) await onExportTeam(teamSections);
      else if (isAirsa && onExportAirsa) await onExportAirsa(airsaSections);
      else if (isNai && onExportNai) await onExportNai(naiSections);
      else if (onExportPtp) await onExportPtp(ptpSections);
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

  const renderGroup = <K extends string>(
    group: SectionGroup<K>,
    state: Record<K, boolean>,
    toggle: (key: K) => void,
    renderChild?: (key: K) => React.ReactNode,
  ) => (
    <div key={group.title} className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group.title}
      </h4>
      <div className="space-y-3">
        {group.options.map((opt) => (
          <div key={opt.key} className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id={opt.key}
                checked={state[opt.key]}
                onCheckedChange={() => toggle(opt.key)}
                className="mt-0.5"
              />
              <Label htmlFor={opt.key} className="flex-1 cursor-pointer leading-tight">
                <div className="text-sm font-semibold text-foreground">{opt.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
              </Label>
            </div>
            {renderChild?.(opt.key)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPtpChild = (key: keyof PdfSections): React.ReactNode => {
    if (key !== "assessmentResponses") return null;
    const parentOn = ptpSections.assessmentResponses;
    return (
      <div className="ml-7 flex items-start gap-3">
        <Checkbox
          id="assessmentResponsesIncludeInsights"
          checked={ptpSections.assessmentResponsesIncludeInsights}
          disabled={!parentOn}
          onCheckedChange={(checked) =>
            setPtpSections((prev) => ({ ...prev, assessmentResponsesIncludeInsights: !!checked }))
          }
          className="mt-0.5"
        />
        <Label
          htmlFor="assessmentResponsesIncludeInsights"
          className={`flex-1 cursor-pointer leading-tight ${!parentOn ? "opacity-50" : ""}`}
        >
          <div className="text-sm font-semibold text-foreground">Include facet insights per response</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Add positive and negative impact details under each question
          </div>
        </Label>
      </div>
    );
  };

  const chipLabel = isPaired
    ? "Paired report sections"
    : isTeam
    ? "Team report sections"
    : isAirsa
    ? "AIRSA report sections"
    : isNai
    ? "NAI report sections"
    : "PTP report sections";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>
            Choose which sections to include in your report.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-muted-foreground">{chipLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => setAll(!allSelected)}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-6 py-4">
          {isPaired
            ? visiblePairedGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, pairedSections as Record<keyof PairedPdfSectionsUi, boolean>, togglePaired)}
                  {i < visiblePairedGroups.length - 1 && <Separator />}
                </div>
              ))
            : isTeam
            ? visibleTeamGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, teamSections as Record<keyof TeamPdfSectionsUi, boolean>, toggleTeam)}
                  {i < visibleTeamGroups.length - 1 && <Separator />}
                </div>
              ))
            : isAirsa
            ? visibleAirsaGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, airsaSections as Record<keyof AirsaPdfSectionsUi, boolean>, toggleAirsa)}
                  {i < visibleAirsaGroups.length - 1 && <Separator />}
                </div>
              ))
            : isNai
            ? visibleNaiGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, naiSections as Record<keyof NaiPdfSectionsUi, boolean>, toggleNai)}
                  {i < visibleNaiGroups.length - 1 && <Separator />}
                </div>
              ))
            : visiblePtpGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, ptpSections as Record<keyof PdfSections, boolean>, togglePtp, renderPtpChild)}
                  {i < visiblePtpGroups.length - 1 && <Separator />}
                </div>
              ))}
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Download PDF</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
