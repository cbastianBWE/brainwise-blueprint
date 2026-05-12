import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandColorSwatch } from "./BrandColorSwatch";
import { cn } from "@/lib/utils";

export type BlockPadding = "none" | "small" | "medium" | "large";

interface Props {
  open: boolean;
  selectedCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onBulkDelete: () => void;
  onBulkDuplicate: () => void;
  onBulkMoveUp: () => void;
  onBulkMoveDown: () => void;
  onBulkSelectAll: () => void;
  onBulkClearSelection: () => void;
  onApplyBackground: (hex: string | null) => void;
  onApplyPadding: (padding: BlockPadding) => void;
}

const PADDING_OPTIONS: { value: BlockPadding; label: string }[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export function ManageBlocksSidebar({
  open,
  selectedCount,
  canMoveUp,
  canMoveDown,
  onBulkDelete,
  onBulkDuplicate,
  onBulkMoveUp,
  onBulkMoveDown,
  onBulkSelectAll,
  onBulkClearSelection,
  onApplyBackground,
  onApplyPadding,
}: Props) {
  const [pendingBg, setPendingBg] = useState<string | null>(null);
  const [pendingPadding, setPendingPadding] = useState<BlockPadding>("none");
  const hasSelection = selectedCount > 0;

  return (
    <aside
      className={cn(
        "fixed z-20 flex flex-col border-l bg-background shadow-md transition-[right] duration-300 ease-out",
        !open && "pointer-events-none",
      )}
      style={{
        top: 56,
        right: open ? 0 : -320,
        bottom: 0,
        width: 320,
      }}
      aria-hidden={!open}
    >
      <div className="border-b px-4 py-3">
        <div
          className="font-display text-base font-semibold tracking-tight"
          style={{ color: "#021F36" }}
        >
          Manage blocks
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {hasSelection
            ? `${selectedCount} block${selectedCount === 1 ? "" : "s"} selected`
            : "No blocks selected"}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {!hasSelection && (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Select blocks to enable bulk actions.
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Selection
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onBulkSelectAll}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!hasSelection}
              onClick={onBulkClearSelection}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Actions
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection || !canMoveUp}
              onClick={onBulkMoveUp}
            >
              <ChevronUp className="mr-1 h-4 w-4" />
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection || !canMoveDown}
              onClick={onBulkMoveDown}
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              Move down
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection}
              onClick={onBulkDuplicate}
            >
              <Copy className="mr-1 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection}
              onClick={onBulkDelete}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Apply style
          </Label>

          <div className="space-y-2">
            <div className="text-xs font-medium">Background color</div>
            <BrandColorSwatch
              palette="tints"
              allowDefault
              value={pendingBg}
              onChange={(hex) => setPendingBg(hex)}
              onDefaultSelected={() => setPendingBg(null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!hasSelection}
              onClick={() => onApplyBackground(pendingBg)}
            >
              <Paintbrush className="mr-1 h-4 w-4" />
              Apply background to {selectedCount || 0}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium">Padding</div>
            <Select
              value={pendingPadding}
              onValueChange={(v) => setPendingPadding(v as BlockPadding)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADDING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!hasSelection}
              onClick={() => onApplyPadding(pendingPadding)}
            >
              Apply padding to {selectedCount || 0}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
