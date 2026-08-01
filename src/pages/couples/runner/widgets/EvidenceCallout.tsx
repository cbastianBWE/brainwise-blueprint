import { ShieldCheck } from "lucide-react";

/**
 * The curated string renders exactly as stored. No model rewriting, no
 * summarising, no reordering — this component only frames it.
 */
export function EvidenceCallout({
  label,
  text,
  footnote,
}: {
  label: string;
  text: string;
  footnote?: string;
}) {
  return (
    <section
      aria-label={label}
      className="rounded-lg border-2 border-primary/25 bg-primary/[0.04] p-4"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</p>
      </div>
      <div className="mt-2 space-y-2">
        {text
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 0)
          .map((p, i) => (
            <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
              {p}
            </p>
          ))}
      </div>
      {footnote && <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>}
    </section>
  );
}
