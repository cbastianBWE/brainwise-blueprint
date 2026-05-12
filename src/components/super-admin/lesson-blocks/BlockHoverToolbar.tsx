import {
  GripVertical,
  Pencil,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
} from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Button } from "@/components/ui/button";

interface Props {
  isFirst: boolean;
  isLast: boolean;
  dragAttributes: DraggableAttributes;
  dragListeners: SyntheticListenerMap | undefined;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockHoverToolbar({
  isFirst,
  isLast,
  dragAttributes,
  dragListeners,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      onClick={stop}
      className="flex items-center gap-0.5 rounded-full border bg-background p-1 shadow-md"
    >
      <button
        type="button"
        className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        aria-label="Drag block"
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
        onClick={onEdit}
        aria-label="Edit block"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label="Move up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label="Move down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
        onClick={onDuplicate}
        aria-label="Duplicate block"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label="Delete block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
