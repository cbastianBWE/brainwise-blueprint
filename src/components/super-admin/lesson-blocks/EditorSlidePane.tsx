import { useEffect } from "react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BlockEditorPane } from "./BlockEditorPane";
import { BLOCK_TYPE_META, type EditorBlock } from "./blockTypeMeta";

interface Props {
  open: boolean;
  block: EditorBlock | null;
  contentItemId: string;
  onChange: (next: EditorBlock) => void;
  onClose: () => void;
  isDirty: boolean;
  saving: boolean;
  onRequestSave: () => void;
}

export function EditorSlidePane({
  open,
  block,
  contentItemId,
  onChange,
  onClose,
  isDirty,
  saving,
  onRequestSave,
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
      className={cn(
        "editor-slide-pane fixed z-20 flex flex-col border-r bg-background shadow-md transition-[left] duration-300 ease-out",
        !open && "pointer-events-none",
      )}
      style={{
        top: 56,
        left: open ? "var(--sidebar-width, 0px)" : "-480px",
        bottom: 0,
        width: "min(480px, calc(100vw - var(--sidebar-width, 0px)))",
      }}
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
        <div className="border-t bg-background p-3">
          <Button
            type="button"
            className="w-full shadow-cta"
            disabled={!isDirty || saving}
            onClick={onRequestSave}
          >
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save lesson
          </Button>
        </div>
    </aside>
  );
}
