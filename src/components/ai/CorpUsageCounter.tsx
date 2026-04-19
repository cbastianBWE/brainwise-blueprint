interface Props {
  currentCount: number;
  limit: number;
}

export default function CorpUsageCounter({ currentCount, limit }: Props) {
  const pct = limit > 0 ? Math.round((currentCount / limit) * 100) : 0;

  let barColor = "bg-accent"; // green
  if (pct >= 80) barColor = "bg-[hsl(30,90%,50%)]"; // orange
  else if (pct >= 50) barColor = "bg-[hsl(45,90%,50%)]"; // yellow

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {currentCount} of {limit} chat messages used this month
      </p>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
