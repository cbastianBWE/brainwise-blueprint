import { IN_SCOPE_BLOCK_TYPES, BLOCK_TYPE_META, type BlockType } from "./blockTypeMeta";

interface AddBlockPopoverProps {
  onSelect: (blockType: BlockType) => void;
}

export function AddBlockPopover({ onSelect }: AddBlockPopoverProps) {
  return (
    <div className="space-y-1">
      <div className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
        Insert block
      </div>
      <div className="grid gap-0.5">
        {IN_SCOPE_BLOCK_TYPES.map((bt) => {
          const meta = BLOCK_TYPE_META[bt];
          const Icon = meta.icon;
          return (
            <button
              key={bt}
              type="button"
              onClick={() => onSelect(bt)}
              className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
            >
              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="text-xs text-muted-foreground">
                  {meta.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
