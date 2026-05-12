import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoDeleteToast({
  open,
  onUndo,
  onDismiss,
  durationMs = 6000,
}: Props) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setProgress(100);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(pct);
      if (elapsed >= durationMs) {
        onDismiss();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, durationMs, onDismiss]);

  if (!open) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-6 z-50 w-72 overflow-hidden rounded-md border border-l-4 bg-background shadow-md"
      style={{ borderLeftColor: "#006D77" }}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          Block deleted
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="text-sm font-semibold"
          style={{ color: "#F5741A" }}
        >
          Undo
        </button>
      </div>
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%`, background: "#006D77" }}
        />
      </div>
    </div>
  );
}
