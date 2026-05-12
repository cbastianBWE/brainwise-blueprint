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
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-transparent text-xs text-muted-foreground transition-all hover:h-8 hover:border-[#F5741A]/40 hover:bg-[#F5741A]/5 hover:text-[#F5741A]"
          style={{ height: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.height = "32px")}
          onMouseLeave={(e) => (e.currentTarget.style.height = "6px")}
        >
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Plus className="h-3.5 w-3.5" />
            Add block
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
