import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function formatMoney(amount: number | string | null | undefined, currency: string | null | undefined) {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(n || 0);
  } catch {
    return `${code} ${(n || 0).toFixed(2)}`;
  }
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString();
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground hover:bg-muted",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20",
  viewed: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20",
  partially_paid: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
  paid: "bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/20",
  overdue: "bg-destructive/15 text-destructive hover:bg-destructive/20",
  void: "bg-muted text-muted-foreground hover:bg-muted",
  written_off: "bg-muted text-muted-foreground hover:bg-muted",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status || "draft").toLowerCase();
  const label = key.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", STATUS_CLASSES[key] ?? STATUS_CLASSES.draft)}>
      {label}
    </Badge>
  );
}
