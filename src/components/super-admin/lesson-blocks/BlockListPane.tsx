import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  BLOCK_TYPE_META,
  CALLOUT_COLORS,
  extractTextFromTipTap,
  type BlockType,
  type EditorBlock,
} from "./blockTypeMeta";
import { AddBlockPopover } from "./AddBlockPopover";
import { useAssetSignedUrl } from "./useAssetSignedUrl";

interface Props {
  blocks: EditorBlock[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (clientId: string) => void;
  onInsert: (atIndex: number, blockType: BlockType) => void;
}

function InsertButton({
  atIndex,
  onInsert,
}: {
  atIndex: number;
  onInsert: (atIndex: number, blockType: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-2 w-full items-center justify-center rounded border border-dashed border-transparent text-muted-foreground hover:border-[#F5741A] hover:text-[#F5741A]"
          aria-label="Insert block"
        >
          <Plus className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
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

function ImageThumb({ assetId }: { assetId: string | null }) {
  const { signedUrl } = useAssetSignedUrl(assetId, !!assetId);
  if (!assetId || !signedUrl) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
        none
      </div>
    );
  }
  return (
    <img
      src={signedUrl}
      alt=""
      className="h-10 w-10 rounded object-cover"
    />
  );
}

function CardPreview({ block }: { block: EditorBlock }) {
  const meta = BLOCK_TYPE_META[block.block_type];
  const Icon = meta.icon;
  const cfg: any = block.config ?? {};

  switch (block.block_type) {
    case "text": {
      const text = extractTextFromTipTap(cfg.body) || "Empty text";
      return (
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {text.slice(0, 120)}
          </div>
        </div>
      );
    }
    case "heading":
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="truncate text-sm font-medium">
            {cfg.text || <span className="text-muted-foreground">Untitled heading</span>}
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">
            H{cfg.level ?? 2}
          </Badge>
        </div>
      );
    case "divider":
      return (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Divider</span>
        </div>
      );
    case "image":
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <ImageThumb assetId={cfg.asset_id ?? null} />
          <div className="truncate text-xs text-muted-foreground">
            {cfg.alt || "No alt text"}
          </div>
        </div>
      );
    case "video_embed":
      return (
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {cfg.source_type === "supabase_storage" ? (
              <ImageThumb assetId={cfg.asset_id ?? null} />
            ) : (
              <span className="truncate text-xs text-muted-foreground">
                {cfg.source_type}: {cfg.source_id || "—"}
              </span>
            )}
          </div>
          {cfg.title && <div className="truncate text-xs">{cfg.title}</div>}
        </div>
      );
    case "callout": {
      const color = CALLOUT_COLORS[cfg.variant ?? "info"];
      const text = extractTextFromTipTap(cfg.body) || "Empty callout";
      return (
        <div className="flex items-stretch gap-2 min-w-0">
          <div className="w-1 rounded" style={{ background: color }} />
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {text.slice(0, 100)}
          </div>
        </div>
      );
    }
    case "list": {
      const n = Array.isArray(cfg.items) ? cfg.items.length : 0;
      return (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">List ({n} item{n === 1 ? "" : "s"})</span>
        </div>
      );
    }
    case "quote": {
      const text = extractTextFromTipTap(cfg.body) || "Empty quote";
      return (
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="line-clamp-1 text-xs italic text-muted-foreground">
              {text.slice(0, 100)}
            </div>
          </div>
          {cfg.attribution && (
            <div className="truncate pl-6 text-[11px] text-muted-foreground">
              — {cfg.attribution}
            </div>
          )}
        </div>
      );
    }
    case "embed_audio":
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">
            {cfg.asset_id ? "Audio file" : "No audio"}
          </span>
          {cfg.transcript && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              transcript
            </Badge>
          )}
        </div>
      );
    default:
      return null;
  }
}

function SortableCard({
  block,
  selected,
  onSelect,
  onRequestDelete,
}: {
  block: EditorBlock;
  selected: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.client_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card p-2 transition-colors",
        selected && "ring-2 ring-primary bg-accent/50",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag block"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <CardPreview block={block} />
      </button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
        aria-label="Delete block"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function BlockListPane({
  blocks,
  selectedClientId,
  onSelect,
  onReorder,
  onDelete,
  onInsert,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.client_id === active.id);
    const to = blocks.findIndex((b) => b.client_id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={blocks.map((b) => b.client_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            <InsertButton atIndex={0} onInsert={onInsert} />
            {blocks.map((b, i) => (
              <div key={b.client_id} className="space-y-1">
                <SortableCard
                  block={b}
                  selected={selectedClientId === b.client_id}
                  onSelect={() => onSelect(b.client_id)}
                  onRequestDelete={() => setPendingDelete(b.client_id)}
                />
                <InsertButton atIndex={i + 1} onInsert={onInsert} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this block?</AlertDialogTitle>
            <AlertDialogDescription>
              This is local-only until Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
