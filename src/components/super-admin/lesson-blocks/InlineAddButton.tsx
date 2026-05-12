import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddBlockPopover } from "./AddBlockPopover";
import type { BlockType } from "./blockTypeMeta";

interface Props {
  atIndex: number;
  onInsert: (atIndex: number, blockType: BlockType) => void;
}

export function InlineAddButton({ atIndex, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add block"
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-md border border-dashed text-xs transition-all"
          style={{
            height: 12,
            borderColor: "#DCD7C8",
            color: "#8E8995",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.height = "36px";
            e.currentTarget.style.borderColor = "#F5741A";
            e.currentTarget.style.color = "#F5741A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.height = "12px";
            e.currentTarget.style.borderColor = "#DCD7C8";
            e.currentTarget.style.color = "#8E8995";
          }}
        >
          <span className="flex items-center gap-1">
            <Plus className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              Add block
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 p-2">
        <AddBlockPopover
          onSelect={(bt) => {
            onInsert(atIndex, bt);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
