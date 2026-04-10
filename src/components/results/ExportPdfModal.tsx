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
  aiNarrative: boolean;
  drivingFacetScores: boolean;
  drivingFacetInsights: boolean;
  crossAssessmentRecs: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (sections: PdfSections) => Promise<void>;
  hasNarrative: boolean;
  hasFacets: boolean;
  hasRecommendations: boolean;
}

const SECTION_OPTIONS: { key: keyof PdfSections; label: string; needsCheck: keyof Props | null }[] = [
  { key: "profileOverview", label: "Profile Overview (dimension scores & stat cards)", needsCheck: null },
  { key: "aiNarrative", label: "AI Narrative (full Profile Interpretation text)", needsCheck: "hasNarrative" },
  { key: "drivingFacetScores", label: "Driving Facet Scores (elevated & suppressed facets)", needsCheck: "hasFacets" },
  { key: "drivingFacetInsights", label: "Driving Facet Insights (✅/❌ behavioral impact analysis)", needsCheck: "hasNarrative" },
  { key: "crossAssessmentRecs", label: "Cross-Assessment Recommendations", needsCheck: "hasRecommendations" },
];

export default function ExportPdfModal({ open, onOpenChange, onExport, hasNarrative, hasFacets, hasRecommendations }: Props) {
  const [sections, setSections] = useState<PdfSections>({
    profileOverview: true,
    aiNarrative: true,
    drivingFacetScores: true,
    drivingFacetInsights: true,
    crossAssessmentRecs: true,
  });
  const [exporting, setExporting] = useState(false);

  const checkProps = { hasNarrative, hasFacets, hasRecommendations } as Record<string, boolean>;

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
          {SECTION_OPTIONS.map((opt) => {
            const available = opt.needsCheck ? checkProps[opt.needsCheck] !== false : true;
            return (
              <div key={opt.key} className="flex items-center space-x-3">
                <Checkbox
                  id={opt.key}
                  checked={sections[opt.key] && available}
                  disabled={!available}
                  onCheckedChange={() => toggle(opt.key)}
                />
                <Label
                  htmlFor={opt.key}
                  className={`text-sm leading-tight ${!available ? "text-muted-foreground/50" : "text-foreground"}`}
                >
                  {opt.label}
                  {!available && " (not available)"}
                </Label>
              </div>
            );
          })}
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
