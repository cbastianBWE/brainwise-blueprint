import { LifeBuoy } from "lucide-react";
import {
  RESOURCE_LISTS,
  STANDING_FOOTER_COPY,
  type ResourceKind,
  type SupportSignal,
} from "../supportResources";

/**
 * "This needs a person." Rendered when the SERVER has fired one of the
 * deterministic signals on this activity. The list is curated data; the model
 * never invents an item and never edits one.
 */
export function SupportResourcePanel({
  fired,
  standingFooter,
}: {
  fired: Array<{ signal: SupportSignal; kind: ResourceKind }>;
  standingFooter?: boolean;
}) {
  if (fired.length === 0 && !standingFooter) return null;

  return (
    <div className="space-y-3">
      {fired.map(({ signal, kind }) => {
        const list = RESOURCE_LISTS[kind];
        const crisis = signal === "crisis_signal";
        return (
          <section
            key={signal}
            aria-label={list.heading}
            className={
              "rounded-lg border p-4 " +
              (crisis ? "border-destructive/40 bg-destructive/[0.06]" : "bg-muted/30")
            }
          >
            <div className="flex items-center gap-2">
              <LifeBuoy
                className={"h-4 w-4 " + (crisis ? "text-destructive" : "text-muted-foreground")}
                aria-hidden
              />
              <h3 className="text-sm font-semibold">{list.heading}</h3>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{list.blurb}</p>
            <ul className="mt-3 space-y-2">
              {list.items.map((r) => (
                <li key={r.name} className="rounded-md border bg-background p-3">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {r.contact && <span className="text-xs font-medium">{r.contact}</span>}
                    {r.href && (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline underline-offset-2"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {standingFooter && (
        <p className="rounded-md border-l-2 border-muted-foreground/30 py-1 pl-3 text-xs text-muted-foreground">
          {STANDING_FOOTER_COPY}
        </p>
      )}
    </div>
  );
}
