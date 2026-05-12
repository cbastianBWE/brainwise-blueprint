import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockEditorPane } from "./BlockEditorPane";
import { BLOCK_TYPE_META, type EditorBlock } from "./blockTypeMeta";

interface Props {
  open: boolean;
  block: EditorBlock | null;
  contentItemId: string;
  onChange: (next: EditorBlock) => void;
  onClose: () => void;
}

export function EditorSlidePane({
  open,
  block,
  contentItemId,
  onChange,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const meta = block ? BLOCK_TYPE_META[block.block_type] : null;
  const Icon = meta?.icon;

  return (
    <aside
      className={`editor-slide-pane fixed left-0 top-0 z-30 flex h-screen w-full flex-col border-r bg-background transition-transform duration-300 ease-out md:w-[480px] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <div
            className="font-display text-base font-semibold tracking-tight"
            style={{ color: "#021F36" }}
          >
            {meta?.label ?? "Edit block"}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClose}
          aria-label="Close edit pane"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <BlockEditorPane
          block={block}
          onChange={onChange}
          contentItemId={contentItemId}
        />
      </div>
    </aside>
  );
}
