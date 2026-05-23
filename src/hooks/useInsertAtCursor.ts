import { useCallback, useRef } from "react";

/**
 * Insert text at the current cursor position of a controlled textarea.
 * Caller owns the ref + controlled value/setter; hook splices at selectionStart
 * and restores focus/cursor after the React commit via rAF.
 */
export function useInsertAtCursor(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
) {
  const pendingCursorRef = useRef<number | null>(null);

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        setValue(value + text);
        return;
      }
      const start = ta.selectionStart ?? value.length;
      const end = ta.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      pendingCursorRef.current = start + text.length;
      setValue(next);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        const cursor = pendingCursorRef.current;
        if (node && cursor !== null) {
          node.focus();
          node.setSelectionRange(cursor, cursor);
        }
        pendingCursorRef.current = null;
      });
    },
    [textareaRef, value, setValue],
  );

  return insertAtCursor;
}
