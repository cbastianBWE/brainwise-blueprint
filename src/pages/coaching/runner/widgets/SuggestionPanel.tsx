import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SuggestionPanel({
  sessionId,
  stepKey,
  suggest,
  existing,
  pending,
  onPendingChange,
  onAdd,
}: {
  sessionId: string;
  stepKey: string;
  suggest: { mode: string; buttonLabel?: string };
  existing: string[];
  pending: string[] | undefined;
  onPendingChange: (next: string[]) => void;
  onAdd: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const firedRef = useRef(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("coaching-activity-suggest", {
        body: { session_id: sessionId, key: stepKey, exclude: [...existing, ...(pending || [])] },
      });
      const list =
        !error && Array.isArray((data as any)?.suggestions)
          ? ((data as any).suggestions as string[])
          : [];
      const merged = [...(pending || [])];
      for (const s of list) {
        if (!merged.some((m) => m.toLowerCase().trim() === s.toLowerCase().trim())) merged.push(s);
      }
      onPendingChange(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (suggest.mode === "auto" && pending === undefined && !firedRef.current) {
      firedRef.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggest.mode, pending]);

  const items = pending || [];

  if (suggest.mode === "auto" && loading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Thinking of a few ideas…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="rounded-md border border-dashed p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suggested for you</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="flex-1 text-sm">{item}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAdd(item);
                  onPendingChange(items.filter((_, j) => j !== i));
                }}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPendingChange(items.filter((_, j) => j !== i))}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}
      {suggest.mode === "on_demand" && (
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {suggest.buttonLabel || "Suggest a few more"}
        </Button>
      )}
    </div>
  );
}
