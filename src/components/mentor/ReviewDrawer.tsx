import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import SkillsPracticeReviewPanel from "./SkillsPracticeReviewPanel";
import LiveEventReviewPanel from "./LiveEventReviewPanel";
import WrittenSummaryReviewPanel from "./WrittenSummaryReviewPanel";

export interface ReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItemId: string | null;
  itemType: string | null;
  traineeId: string | null;
  onActionComplete: () => void;
}

const TITLE: Record<string, string> = {
  skills_practice: "Skills Practice Review",
  live_event: "Live Event Attendance",
  written_summary: "Written Summary Review",
};

export default function ReviewDrawer({
  open,
  onOpenChange,
  contentItemId,
  itemType,
  traineeId,
  onActionComplete,
}: ReviewDrawerProps) {
  const renderPanel = () => {
    if (!contentItemId || !itemType || !traineeId) return null;
    const common = { contentItemId, traineeId, onActionComplete };
    switch (itemType) {
      case "skills_practice":
        return <SkillsPracticeReviewPanel {...common} />;
      case "live_event":
        return <LiveEventReviewPanel {...common} />;
      case "written_summary":
        return <WrittenSummaryReviewPanel {...common} />;
      default:
        return (
          <p className="text-sm text-muted-foreground py-8 text-center">
            This item type has no mentor review action.
          </p>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{(itemType && TITLE[itemType]) || "Review"}</SheetTitle>
          <SheetDescription>
            Review this trainee's progress on this learning item.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">{renderPanel()}</div>
      </SheetContent>
    </Sheet>
  );
}
