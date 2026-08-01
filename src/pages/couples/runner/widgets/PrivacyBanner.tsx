import { Lock } from "lucide-react";

/** Quiet, persistent privacy banner. Never a dismissible toast. */
export function PrivacyBanner({ badge, detail }: { badge: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs font-medium">{badge}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
