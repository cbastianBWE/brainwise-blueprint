import { useState } from "react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (sections: PdfSections) => Promise<void>;
}

const SECTION_OPTIONS: { key: keyof PdfSections; label: string }[] = [
  { key: "profileOverview", label: "Profile Overview (stat cards + dimension score cards)" },
  { key: "drivingFacetScores", label: "Driving Facet Scores (elevated & suppressed bar charts)" },
  { key: "profileOverviewNarrative", label: "Profile Overview Narrative (AI-generated profile summary)" },
  { key: "ptpBrainOverview", label: "PTP and Brain Overview (framework introduction)" },
  { key: "dimensionHighlights", label: "Dimension Highlights (AI-generated dimension cards)" },
  { key: "drivingFacetInsights", label: "Driving Facet Insights (elevated & suppressed behavioral impacts)" },
  { key: "crossAssessmentConnections", label: "Cross-Assessment Connections (AI-generated analysis)" },
  { key: "assessmentResponses", label: "Assessment Responses (all questions and scores)" },
];

export default function ExportPdfModal({ open, onOpenChange, onExport }: Props) {
  const [sections, setSections] = useState<PdfSections>({
    profileOverview: true,
    drivingFacetScores: true,
    profileOverviewNarrative: true,
    ptpBrainOverview: true,
    dimensionHighlights: true,
    drivingFacetInsights: true,
    crossAssessmentConnections: true,
    assessmentResponses: true,
  });
  const [exporting, setExporting] = useState(false);

  const toggle = (key: keyof PdfSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(sections);
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

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
          {SECTION_OPTIONS.map((opt) => (
            <div key={opt.key} className="flex items-center space-x-3">
              <Checkbox
                id={opt.key}
                checked={sections[opt.key]}
                onCheckedChange={() => toggle(opt.key)}
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
