import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
}

interface AuditRow {
  audit_id: string;
  created_at: string;
  action_type: string;
  category: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_account_type: string | null;
  reason: string | null;
  before_value: unknown;
  after_value: unknown;
  detail: unknown;
  total_count: number;
}

const BATCH = 50;
const ALL_CATEGORIES = [
  "role",
  "completion",
  "certification",
  "permission",
  "impersonation",
  "other",
] as const;
type Category = (typeof ALL_CATEGORIES)[number];

export default function MemberDrawerAudit({ userId }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<Category[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<AuditRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reset when filters change.
  useEffect(() => {
    setOffset(0);
    setAccumulated([]);
  }, [selectedCategories, userId]);

  const auditQuery = useQuery({
    queryKey: ["member-audit", userId, offset, selectedCategories],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_user_audit_history", {
        p_user_id: userId,
        p_limit: BATCH,
        p_offset: offset,
        p_categories: selectedCategories,
      } as any);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  useEffect(() => {
    if (auditQuery.data) {
      setAccumulated((prev) =>
        offset === 0 ? auditQuery.data! : [...prev, ...auditQuery.data!],
      );
    }
  }, [auditQuery.data, offset]);

  const totalCount = Number(accumulated[0]?.total_count ?? 0);
  const hasMore = accumulated.length < totalCount;

  const toggleCategory = (cat: Category, active: boolean) => {
    setSelectedCategories((prev) => {
      const current = prev ?? [];
      const next = active ? current.filter((c) => c !== cat) : [...current, cat];
      return next.length === 0 ? null : next;
    });
  };

  if (auditQuery.isLoading && accumulated.length === 0) {
    return (
      <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading audit history…
      </div>
    );
  }

  if (auditQuery.error && accumulated.length === 0) {
    return (
      <div className="p-4 text-sm text-destructive">Failed to load audit history.</div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={selectedCategories === null ? "default" : "outline"}
          onClick={() => setSelectedCategories(null)}
        >
          All
        </Button>
        {ALL_CATEGORIES.map((cat) => {
          const active = selectedCategories?.includes(cat) ?? false;
          return (
            <Button
              key={cat}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggleCategory(cat, active)}
              className="capitalize"
            >
              {cat}
            </Button>
          );
        })}
      </div>

      {accumulated.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground italic">
          No audit events for this user.
        </div>
      ) : (
        <div className="space-y-2">
          {accumulated.map((row) => {
            const expanded = expandedId === row.audit_id;
            return (
              <div key={row.audit_id} className="rounded-md border text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : row.audit_id)}
                  className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/50"
                >
                  <ChevronRight
                    className={`h-4 w-4 mt-0.5 shrink-0 transition-transform ${
                      expanded ? "rotate-90" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium">{row.actor_name ?? "Unknown admin"}</span>
                      {row.actor_account_type && (
                        <span className="text-muted-foreground">
                          ({row.actor_account_type})
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {row.category}
                      </Badge>
                      <span className="font-mono text-[11px]">{row.action_type}</span>
                    </div>
                    {row.reason && (
                      <p className="text-muted-foreground text-xs">{row.reason}</p>
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t p-3 space-y-2 bg-muted/20">
                    {[
                      { label: "Before", val: row.before_value },
                      { label: "After", val: row.after_value },
                      { label: "Detail", val: row.detail },
                    ].map((b) => (
                      <div key={b.label}>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          {b.label}
                        </div>
                        <pre className="text-[11px] bg-background border rounded p-2 overflow-x-auto">
                          {JSON.stringify(b.val ?? null, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {accumulated.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Showing {accumulated.length} of {totalCount}
          </span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(accumulated.length)}
              disabled={auditQuery.isFetching}
            >
              {auditQuery.isFetching && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Load 50 more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
