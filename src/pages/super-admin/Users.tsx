import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MoreHorizontal, UserCog, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JustificationModal from "@/components/impersonation/JustificationModal";

interface SearchRow {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
  organization_name: string | null;
  total_count: number;
}

const PAGE_SIZE = 25;

const formatAccountType = (t: string | null): string => {
  if (!t) return "Unknown";
  return t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const accountTypeBadgeVariant = (
  t: string | null
): "default" | "secondary" | "destructive" | "outline" => {
  if (!t) return "outline";
  switch (t) {
    case "brainwise_super_admin":
      return "destructive";
    case "org_admin":
    case "company_admin":
      return "default";
    case "coach":
      return "secondary";
    default:
      return "outline";
  }
};

const SuperAdminUsers = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [justificationTarget, setJustificationTarget] = useState<{
    user_id: string;
    email: string;
    full_name: string | null;
    account_type: string | null;
  } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ["impersonation-targets", debouncedQuery, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: debouncedQuery.length >= 2 ? debouncedQuery : null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      } as any);
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
    enabled: true,
    staleTime: 30_000,
  });

  const totalCount = Number(results?.[0]?.total_count ?? 0);
  const showPagination = totalCount > PAGE_SIZE;

  const openJustificationModal = (row: SearchRow) =>
    setJustificationTarget({
      user_id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      account_type: row.account_type,
    });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and search all users on the platform. Search by email, name, or organization. Use the actions menu on any row to impersonate or perform admin operations.
        </p>
      </div>

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
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skel-${i}`}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}

            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-sm text-destructive">Search failed. Please try again.</p>
                  <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && results && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  {debouncedQuery.length >= 2
                    ? `No users matching "${debouncedQuery}".`
                    : "No users found."}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && results && results.map((row) => {
              const isSelf = row.user_id === user?.id;
              return (
                <TableRow key={row.user_id}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    {row.full_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={accountTypeBadgeVariant(row.account_type)}>
                      {formatAccountType(row.account_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.organization_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isSelf ? (
                          <DropdownMenuItem disabled>
                            <UserCog className="h-4 w-4 mr-2" />
                            Impersonate
                            <span className="ml-2 text-xs text-muted-foreground">
                              (cannot impersonate yourself)
                            </span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => openJustificationModal(row)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Impersonate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem disabled>
                          Reset MFA
                          <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          Trigger password reset
                          <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          View access history
                          <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                          Force pseudonymization
                          <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <JustificationModal
        target={justificationTarget}
        onClose={() => setJustificationTarget(null)}
      />
    </div>
  );
};

export default SuperAdminUsers;
