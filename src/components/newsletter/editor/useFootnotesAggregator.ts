import { useEffect, useState, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type { Mark } from "@tiptap/pm/model";

export interface AggregatedFootnote {
  text: string;
  key: string;
}

/**
 * Walks the editor doc in document order, collecting footnoteRef marks and
 * deduping contiguous text-node splits by mark identity (ProseMirror
 * preserves the same Mark instance across split text nodes within a single
 * contiguous mark range).
 *
 * Subscribes to editor "transaction" so the returned array re-renders when
 * refs are added / removed / reordered. Used by both editor and reader
 * NodeViews so the walk logic stays in one place.
 */
export function useFootnotesAggregator(
  editor: Editor | null,
): AggregatedFootnote[] {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const handler = () => setTick((t) => t + 1);
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor]);

  return useMemo(() => {
    if (!editor) return [];
    const out: AggregatedFootnote[] = [];
    let lastMark: Mark | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const refMark = node.marks.find((m) => m.type.name === "footnoteRef");
      if (!refMark) {
        lastMark = null;
        return true;
      }
      // Dedupe contiguous split text nodes carrying the SAME mark instance.
      if (refMark === lastMark) return true;
      lastMark = refMark;
      const text = String(refMark.attrs.footnote_text ?? "");
      out.push({ text, key: `${pos}` });
      return true;
    });
    return out;
    // tick forces re-walk on every transaction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, tick]);
}
