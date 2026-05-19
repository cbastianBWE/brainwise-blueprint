import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImpersonation } from "@/contexts/ImpersonationProvider";
import {
  PAGE_SIZE,
  SearchRow,
  accountTypeBadgeVariant,
  formatAccountType,
} from "./learnerSearchShared";
import AdminLearningTree from "./AdminLearningTree";
import CompletionConfirmDialog, { type MarkTarget } from "./CompletionConfirmDialog";

export default function CompletionControlTab() {
  const { isImpersonating } = useImpersonation();
  const [selected, setSelected] = useState<SearchRow | null>(null);
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Button>
        <div>
          <div className="text-base font-semibold">{selected.full_name || selected.email}</div>
          <div className="text-sm text-muted-foreground">{selected.email}</div>
        </div>
        {isImpersonating && (
          <Alert variant="destructive">
            <AlertTitle>Impersonation session active</AlertTitle>
            <AlertDescription>
              You are in an impersonation session. Exit impersonation before marking completion —
              completion actions are blocked during impersonation.
            </AlertDescription>
          </Alert>
        )}
        <AdminLearningTree
          userId={selected.user_id}
          isImpersonating={isImpersonating}
          onMark={(t) => setMarkTarget({ ...t, userId: selected.user_id })}
        />
        <CompletionConfirmDialog
          target={markTarget}
          onClose={() => setMarkTarget(null)}
          invalidateKey={["get_user_learning_state", selected.user_id]}
        />
      </div>
    );
  }

  return <LearnerPicker onPick={setSelected} />;
}

function LearnerPicker({ onPick }: { onPick: (row: SearchRow) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ["completion-control-search", debouncedQuery, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: debouncedQuery.length >= 2 ? debouncedQuery : null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      } as any);
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
    staleTime: 30_000,
  });

  const totalCount = useMemo(() => Number(results?.[0]?.total_count ?? 0), [results]);
  const showPagination = totalCount > PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, or organization (min 2 characters)"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <p className="text-sm text-destructive">Search failed.</p>
                  <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && results && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              results?.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>{row.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email}</TableCell>
                  <TableCell>
                    <Badge variant={accountTypeBadgeVariant(row.account_type)}>
                      {formatAccountType(row.account_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => onPick(row)}>
                      Manage completion
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
