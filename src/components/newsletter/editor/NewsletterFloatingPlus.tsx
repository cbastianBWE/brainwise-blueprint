/**
 * Notion-style floating "+" button rendered in the left margin of the current
 * empty top-level paragraph. Click → opens the slash menu at cursor.
 *
 * Positioning: absolutely-positioned overlay inside the editor wrapper. Reads
 * the cursor coords from `editor.view.coordsAtPos` and translates them to the
 * wrapper's coordinate space. Throttled with rAF to avoid jitter.
 */
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface NewsletterFloatingPlusProps {
  editor: Editor;
  /** The relative-positioned ancestor inside which we render the button. */
  containerRef: React.RefObject<HTMLElement>;
}

interface PlusState {
  visible: boolean;
  top: number;
  left: number;
}

export function NewsletterFloatingPlus({
  editor,
  containerRef,
}: NewsletterFloatingPlusProps) {
  const [state, setState] = useState<PlusState>({
    visible: false,
    top: 0,
    left: 0,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const container = containerRef.current;
      if (!container) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      const { from, empty } = editor.state.selection;
      if (!empty) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      const $pos = editor.state.doc.resolve(from);
      // Only show in empty top-level paragraphs (depth 1).
      if ($pos.depth !== 1) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      const node = $pos.parent;
      if (node.type.name !== "paragraph" || node.content.size !== 0) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }

      try {
        const coords = editor.view.coordsAtPos(from);
        const rect = container.getBoundingClientRect();
        const top = coords.top - rect.top + container.scrollTop + 2;
        const left = -32; // gutter to the left of the prose surface
        setState({ visible: true, top, left });
      } catch {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
      }
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(update);
    };

    editor.on("selectionUpdate", schedule);
    editor.on("transaction", schedule);
    schedule();

    return () => {
      editor.off("selectionUpdate", schedule);
      editor.off("transaction", schedule);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [editor, containerRef]);

  const open = () => {
    // Insert a "/" at the cursor; the suggestion plugin picks it up.
    editor.chain().focus().insertContent("/").run();
  };

  if (!state.visible) return null;
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Insert block"
      className="absolute z-10 flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-[var(--fg-4)] transition-all duration-150 hover:scale-105 hover:bg-[var(--bw-cream-200)] hover:text-[var(--fg-2)]"
      style={{ top: state.top, left: state.left }}
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
}
