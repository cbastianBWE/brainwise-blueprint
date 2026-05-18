export interface BulkResult {
  operation?: string;
  requested?: number;
  succeeded?: number;
  failed?: number;
  results?: Array<{ status?: string; detail?: string; [k: string]: any }>;
}

export default function ResultPanel({ result }: { result: BulkResult | null }) {
  if (!result) return null;
  const failed = result.failed ?? 0;
  const failures = (result.results ?? []).filter(
    (r) => (r.status ?? "").toLowerCase() !== "success",
  );
  return (
    <div className="mt-4 rounded-md border p-3 text-sm bg-muted/30">
      <div className="font-medium">
        {result.succeeded ?? 0} of {result.requested ?? 0} succeeded, {failed} failed
      </div>
      {failed > 0 && failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {failures.map((f, i) => (
            <li key={i} className="text-destructive">
              <span className="font-mono">{f.status ?? "failed"}</span>
              {f.detail ? ` — ${f.detail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
