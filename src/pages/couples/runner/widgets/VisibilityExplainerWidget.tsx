import { Eye, EyeOff, Users, FileText } from "lucide-react";
import type { CoupleStep } from "../coupleShared";

const TREATMENT: Record<
  string,
  { icon: typeof Eye; card: string; chip: string; label: string }
> = {
  shared: {
    icon: Users,
    card: "border-primary/60 bg-primary/5",
    chip: "bg-primary text-primary-foreground",
    label: "Shared",
  },
  staged: {
    icon: Eye,
    card: "border-dashed border-primary/40 bg-muted/30",
    chip: "bg-secondary text-secondary-foreground",
    label: "Staged",
  },
  summary: {
    icon: FileText,
    card: "border-muted-foreground/30 bg-muted/50",
    chip: "bg-muted text-muted-foreground",
    label: "Summary",
  },
  private: {
    icon: EyeOff,
    card: "border-foreground/40 bg-background ring-1 ring-inset ring-foreground/10",
    chip: "bg-foreground text-background",
    label: "Private",
  },
};

export function VisibilityExplainerWidget({ step }: { step: CoupleStep }) {
  const modes = Array.isArray(step.visibilityModes) ? step.visibilityModes : [];

  return (
    <div className="space-y-4">
      {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map((m) => {
          const t = TREATMENT[m.key] || TREATMENT.shared;
          const Icon = t.icon;
          return (
            <div key={m.key} className={`rounded-lg border p-4 ${t.card}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${t.chip}`}>
                  {t.label}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{m.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{m.example}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
