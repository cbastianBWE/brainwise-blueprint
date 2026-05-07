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
  drivingFacetInsights: boolean;
  crossAssessmentConnections: boolean;
  assessmentResponses: boolean;
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrumentType: "PTP" | "NAI" | "AIRSA" | "OTHER";
  isCoachView?: boolean;
  onExportPtp?: (sections: PdfSections) => Promise<void>;
  onExportNai?: (sections: NaiPdfSectionsUi) => Promise<void>;
  onExportAirsa?: (sections: AirsaPdfSectionsUi) => Promise<void>;
}

type SectionOption<K extends string> = {
  key: K;
  name: string;
  description: string;
  coachOnly?: boolean;
};

type SectionGroup<K extends string> = {
  title: string;
  options: SectionOption<K>[];
};

const PTP_GROUPS: SectionGroup<keyof PdfSections>[] = [
  {
    title: "Profile sections",
    options: [
      { key: "profileOverview", name: "Profile Overview", description: "Stat cards and dimension score cards" },
      { key: "profileOverviewNarrative", name: "Profile Overview Narrative", description: "AI-generated profile summary" },
      { key: "ptpBrainOverview", name: "PTP and Brain Overview", description: "Framework introduction" },
    ],
  },
  {
    title: "Dimension detail sections",
    options: [
      { key: "dimensionHighlights", name: "Dimension Highlights", description: "AI-generated dimension cards" },
      { key: "drivingFacetScores", name: "Driving Facet Scores", description: "Elevated and suppressed bar charts" },
      { key: "drivingFacetInsights", name: "Driving Facet Insights", description: "Elevated and suppressed behavioral impacts" },
    ],
  },
  {
    title: "Cross-cutting sections",
    options: [
      { key: "crossAssessmentConnections", name: "Cross-Assessment Connections", description: "AI-generated analysis" },
    ],
  },
  {
    title: "Raw data",
    options: [
      { key: "assessmentResponses", name: "Assessment Responses", description: "All questions and scores" },
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

export default function ExportPdfModal({ open, onOpenChange, instrumentType, isCoachView = false, onExportPtp, onExportNai }: Props) {
  const [ptpSections, setPtpSections] = useState<PdfSections>({
    profileOverview: true,
    drivingFacetScores: true,
    profileOverviewNarrative: true,
    ptpBrainOverview: true,
    dimensionHighlights: true,
    drivingFacetInsights: true,
    crossAssessmentConnections: true,
    assessmentResponses: true,
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

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isCoachView) {
      setNaiSections((prev) => ({ ...prev, patternAlert: false, cafesPtpMapping: false }));
    }
  }, [isCoachView]);

  const isNai = instrumentType === "NAI";

  const visibleNaiGroups = useMemo(
    () =>
      NAI_GROUPS.map((g) => ({
        ...g,
        options: g.options.filter((o) => !o.coachOnly || isCoachView),
      })).filter((g) => g.options.length > 0),
    [isCoachView]
  );

  const visiblePtpGroups = PTP_GROUPS;

  const allSelected = isNai
    ? visibleNaiGroups.every((g) => g.options.every((o) => naiSections[o.key]))
    : visiblePtpGroups.every((g) => g.options.every((o) => ptpSections[o.key]));

  const setAll = (value: boolean) => {
    if (isNai) {
      setNaiSections((prev) => {
        const next = { ...prev };
        visibleNaiGroups.forEach((g) =>
          g.options.forEach((o) => {
            next[o.key] = value;
          })
        );
        return next;
      });
    } else {
      setPtpSections((prev) => {
        const next = { ...prev };
        visiblePtpGroups.forEach((g) =>
          g.options.forEach((o) => {
            next[o.key] = value;
          })
        );
        return next;
      });
    }
  };

  const togglePtp = (key: keyof PdfSections) =>
    setPtpSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleNai = (key: keyof NaiPdfSectionsUi) =>
    setNaiSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleExport = async () => {
    setExporting(true);
    try {
      if (instrumentType === "NAI" && onExportNai) {
        await onExportNai(naiSections);
      } else if (onExportPtp) {
        await onExportPtp(ptpSections);
      }
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

  const renderGroup = <K extends string>(
    group: SectionGroup<K>,
    state: Record<K, boolean>,
    toggle: (key: K) => void
  ) => (
    <div key={group.title} className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group.title}
      </h4>
      <div className="space-y-3">
        {group.options.map((opt) => (
          <div key={opt.key} className="flex items-start gap-3">
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
        ))}
      </div>
    </div>
  );

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
          <span className="text-xs text-muted-foreground">
            {isNai ? "NAI report sections" : "PTP report sections"}
          </span>
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
          {isNai
            ? visibleNaiGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, naiSections as Record<keyof NaiPdfSectionsUi, boolean>, toggleNai)}
                  {i < visibleNaiGroups.length - 1 && <Separator />}
                </div>
              ))
            : visiblePtpGroups.map((g, i) => (
                <div key={g.title} className="space-y-6">
                  {renderGroup(g, ptpSections as Record<keyof PdfSections, boolean>, togglePtp)}
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
