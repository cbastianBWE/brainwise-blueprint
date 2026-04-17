import { useState, useEffect } from "react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrumentType: "PTP" | "NAI" | "OTHER";
  isCoachView?: boolean;
  onExportPtp?: (sections: PdfSections) => Promise<void>;
  onExportNai?: (sections: NaiPdfSectionsUi) => Promise<void>;
}

const PTP_SECTION_OPTIONS: { key: keyof PdfSections; label: string }[] = [
  { key: "profileOverview", label: "Profile Overview (stat cards + dimension score cards)" },
  { key: "drivingFacetScores", label: "Driving Facet Scores (elevated & suppressed bar charts)" },
  { key: "profileOverviewNarrative", label: "Profile Overview Narrative (AI-generated profile summary)" },
  { key: "ptpBrainOverview", label: "PTP and Brain Overview (framework introduction)" },
  { key: "dimensionHighlights", label: "Dimension Highlights (AI-generated dimension cards)" },
  { key: "drivingFacetInsights", label: "Driving Facet Insights (elevated & suppressed behavioral impacts)" },
  { key: "crossAssessmentConnections", label: "Cross-Assessment Connections (AI-generated analysis)" },
  { key: "assessmentResponses", label: "Assessment Responses (all questions and scores)" },
];

const NAI_SECTION_OPTIONS: { key: keyof NaiPdfSectionsUi; label: string; coachOnly?: boolean }[] = [
  { key: "profileOverview", label: "Profile Overview (stat cards + dimension score cards)" },
  { key: "profileOverviewNarrative", label: "Profile Overview Narrative (AI-generated profile summary)" },
  { key: "naiOverview", label: "NAI Overview (framework introduction)" },
  { key: "dimensionHighlights", label: "Dimension Highlights (all 5 C.A.F.E.S. dimensions)" },
  { key: "patternAlert", label: "Pattern Alert (coach coaching guidance)", coachOnly: true },
  { key: "individualResponses", label: "Individual Responses That Warrant Attention (items scoring 75+)" },
  { key: "cafesPtpMapping", label: "C.A.F.E.S.–PTP Mapping (coach coaching materials)", coachOnly: true },
  { key: "crossAssessmentInterpretation", label: "Cross-Assessment Interpretation (AI-generated analysis)" },
  { key: "assessmentResponses", label: "Assessment Responses (all 25 questions and scores)" },
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

  const togglePtp = (key: keyof PdfSections) => {
    setPtpSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNai = (key: keyof NaiPdfSectionsUi) => {
    setNaiSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const isNai = instrumentType === "NAI";
  const naiVisibleOptions = NAI_SECTION_OPTIONS.filter((opt) => !opt.coachOnly || isCoachView);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>
            Choose which sections to include in your report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isNai
            ? naiVisibleOptions.map((opt) => (
                <div key={opt.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={opt.key}
                    checked={naiSections[opt.key]}
                    onCheckedChange={() => toggleNai(opt.key)}
                  />
                  <Label htmlFor={opt.key} className="text-sm leading-tight text-foreground">
                    {opt.label}
                  </Label>
                </div>
              ))
            : PTP_SECTION_OPTIONS.map((opt) => (
                <div key={opt.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={opt.key}
                    checked={ptpSections[opt.key]}
                    onCheckedChange={() => togglePtp(opt.key)}
                  />
                  <Label htmlFor={opt.key} className="text-sm leading-tight text-foreground">
                    {opt.label}
                  </Label>
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
