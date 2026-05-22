import { useState } from "react";
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
const MAX_BATCHES = 4;

export default function MemberDrawerAudit({ userId }: Props) {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<AuditRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auditQuery = useQuery({
    queryKey: ["member-audit", userId, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_user_audit_history", {
        p_user_id: userId,
        p_limit: BATCH,
        p_offset: offset,
        p_categories: null,
      } as any);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  // Merge new batch into accumulated list when fresh data arrives.
  if (auditQuery.data && offset === 0 && accumulated.length === 0 && auditQuery.data.length > 0) {
    // first load
    setAccumulated(auditQuery.data);
  }

  const totalCount = Number(auditQuery.data?.[0]?.total_count ?? accumulated[0]?.total_count ?? 0);
  const canLoadMore =
    accumulated.length < totalCount && accumulated.length < BATCH * MAX_BATCHES;

  const handleLoadMore = async () => {
    const newOffset = accumulated.length;
    const { data, error } = await supabase.rpc("list_user_audit_history", {
      p_user_id: userId,
      p_limit: BATCH,
      p_offset: newOffset,
      p_categories: null,
    } as any);
    if (!error && data) {
      setAccumulated((prev) => [...prev, ...((data ?? []) as unknown as AuditRow[])]);
      setOffset(newOffset);
    }
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
      <div className="p-4 text-sm text-destructive">
        Failed to load audit history.
      </div>
    );
  }

  if (accumulated.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground italic">
        No audit events for this user.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
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

      {canLoadMore && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={handleLoadMore} className="w-full">
            Load more ({accumulated.length} of {totalCount})
          </Button>
        </div>
      )}
    </div>
  );
}
