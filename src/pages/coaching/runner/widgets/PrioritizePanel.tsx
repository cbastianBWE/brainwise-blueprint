import { useEffect } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PrioritizePanel({
  items,
  selectExactly,
  title,
  prompt,
  helper,
  selected,
  onChange,
}: {
  items: string[];
  selectExactly: number;
  title?: string;
  prompt?: string;
  helper?: string;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  // Keep selection a subset of current items (drop stale, dedupe).
  useEffect(() => {
    const filtered = selected.filter((t) => items.includes(t));
    // Dedupe while preserving order.
    const seen = new Set<string>();
    const deduped = filtered.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
    if (
      deduped.length !== selected.length ||
      deduped.some((t, i) => t !== selected[i])
    ) {
      onChange(deduped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join("\u0001")]);

  const selectedSet = new Set(selected);
  const atCap = selected.length >= selectExactly;

  const toggle = (text: string) => {
    if (selectedSet.has(text)) {
      // Remove all occurrences of this text from selection.
      const next = selected.filter((t) => t !== text);
      onChange(next);
      return;
    }
    if (atCap) return;
    // Preserve list order.
    const next = items.filter((t) => selectedSet.has(t) || t === text);
    // Ensure uniqueness in case items has dupes.
    const seen = new Set<string>();
    onChange(next.filter((t) => (seen.has(t) ? false : (seen.add(t), true))));
  };

  if (items.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        {title && <h3 className="text-sm font-semibold">{title}</h3>}
        {prompt && <p className="text-sm text-muted-foreground">{prompt}</p>}
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        <ul className="space-y-2">
          {items.map((text, i) => {
            const checked = selectedSet.has(text);
            const disabled = !checked && atCap;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(text)}
                  className={`w-full text-left flex items-start gap-2 rounded-md border p-2 text-sm transition ${
                    checked
                      ? "border-[var(--bw-orange)] bg-[var(--bw-orange)]/10"
                      : disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted"
                  }`}
                  aria-pressed={checked}
                  aria-disabled={disabled}
                >
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border ${
                      checked ? "border-[var(--bw-orange)] bg-[var(--bw-orange)] text-white" : "border-muted-foreground/40"
                    }`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="flex-1">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          {selected.length} of {selectExactly} chosen
          {atCap ? "" : ` — you can pick ${selectExactly}`}
        </p>
      </CardContent>
    </Card>
  );
}
