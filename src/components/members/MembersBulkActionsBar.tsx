import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  selectedCount: number;
  onClear: () => void;
}

const DISABLED_ACTIONS = ["Assign", "Unassign", "Schedule", "Override completion", "Export"];

export default function MembersBulkActionsBar({ selectedCount, onClear }: Props) {
  if (selectedCount < 1) return null;
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-2 backdrop-blur">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="flex items-center gap-2">
        {DISABLED_ACTIONS.map((label) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled>
                  {label}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Available in cycle 2b</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear selection
        </Button>
      </div>
    </div>
  );
}
