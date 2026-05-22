import { MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { highlightMatch } from "@/lib/highlightMatch";
import type { MemberRow, MembersSortState, MemberColumnId } from "./types";

interface Props {
  rows: MemberRow[] | undefined;
  isLoading: boolean;
  error: unknown;
  selectedIds: Set<string>;
  sort: MembersSortState;
  searchQuery: string;
  visibleColumns: MemberColumnId[];
  currentUserId: string | undefined;
  onToggleSelect: (userId: string) => void;
  onToggleSelectAll: () => void;
  onSortChange: (column: MembersSortState["column"]) => void;
  onRowClick: (userId: string) => void;
  onImpersonate: (row: MemberRow) => void;
}

const SORTABLE: Record<string, MembersSortState["column"]> = {
  name: "name",
  email: "email",
  account_type: "account_type",
  organization: "organization",
  active_assignments: "active_assignments",
  certifications: "certification_count",
  status: "account_status",
  last_login: "last_login",
};

const formatAccountType = (t: string | null): string => {
  if (!t) return "—";
  return t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

function statusBadge(status: string) {
  if (status === "active") {
    return (
      <Badge
        className="border-transparent"
        style={{
          backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
          color: "var(--bw-forest)",
        }}
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Not active
    </Badge>
  );
}

function getCertBadgeStyle(status: string): React.CSSProperties | undefined {
  if (status === "certified") {
    return {
      backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
      color: "var(--bw-forest)",
    };
  }
  if (status === "in_progress") {
    return {
      backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
      color: "var(--bw-mustard)",
    };
  }
  if (status === "revoked") {
    return {
      backgroundColor: "color-mix(in oklab, hsl(var(--destructive)) 12%, white)",
      color: "hsl(var(--destructive))",
    };
  }
  return undefined;
}

function certStatusPill(status: string | null) {
  if (!status) return null;
  const style = getCertBadgeStyle(status);
  const fallback = style ? "" : "bg-muted text-muted-foreground";
  const label = status.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return (
    <Badge className={`text-[10px] border-transparent ${fallback}`} style={style}>
      {label}
    </Badge>
  );
}

function SortHeader({
  label,
  columnKey,
  sort,
  onSortChange,
}: {
  label: string;
  columnKey: MembersSortState["column"];
  sort: MembersSortState;
  onSortChange: Props["onSortChange"];
}) {
  const active = sort.column === columnKey;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSortChange(columnKey)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

export default function MembersTable({
  rows,
  isLoading,
  error,
  selectedIds,
  sort,
  searchQuery,
  visibleColumns,
  currentUserId,
  onToggleSelect,
  onToggleSelectAll,
  onSortChange,
  onRowClick,
  onImpersonate,
}: Props) {
  const showCol = (id: MemberColumnId) => visibleColumns.includes(id);
  const pageIds = (rows ?? []).map((r) => r.user_id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const colCount =
    1 + visibleColumns.filter((c) => c !== "actions").length + 1;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all on page"
              />
            </TableHead>
            {showCol("name") && (
              <TableHead>
                <SortHeader label="Name" columnKey="name" sort={sort} onSortChange={onSortChange} />
              </TableHead>
            )}
            {showCol("email") && (
              <TableHead className="hidden sm:table-cell">
                <SortHeader label="Email" columnKey="email" sort={sort} onSortChange={onSortChange} />
              </TableHead>
            )}
            {showCol("account_type") && (
              <TableHead className="hidden sm:table-cell">
                <SortHeader
                  label="Account type"
                  columnKey="account_type"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {showCol("mentor") && <TableHead className="hidden lg:table-cell">Mentor</TableHead>}
            {showCol("organization") && (
              <TableHead className="hidden lg:table-cell">
                <SortHeader
                  label="Organization"
                  columnKey="organization"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {showCol("active_assignments") && (
              <TableHead className="hidden md:table-cell">
                <SortHeader
                  label="Active assignments"
                  columnKey="active_assignments"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {showCol("certifications") && (
              <TableHead className="hidden md:table-cell">
                <SortHeader
                  label="Certifications"
                  columnKey="certification_count"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {showCol("status") && (
              <TableHead>
                <SortHeader
                  label="Status"
                  columnKey="account_status"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {showCol("last_login") && (
              <TableHead className="hidden lg:table-cell">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <SortHeader
                        label="Last login"
                        columnKey="last_login"
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last password sign-in. Does not reflect active sessions.
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`skel-${i}`}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && error && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center py-8 text-sm text-destructive">
                Failed to load members. {(error as Error)?.message}
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !error && rows && rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="text-center py-8 text-sm text-muted-foreground"
              >
                {searchQuery.length >= 2
                  ? `No members matching "${searchQuery}".`
                  : "No members found."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !error &&
            rows?.map((row) => {
              const isSelf = row.user_id === currentUserId;
              const isSelected = selectedIds.has(row.user_id);
              return (
                <TableRow
                  key={row.user_id}
                  data-state={isSelected ? "selected" : undefined}
                  className="group cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-stop-row-click]")) return;
                    onRowClick(row.user_id);
                  }}
                >
                  <TableCell data-stop-row-click onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(row.user_id)}
                      aria-label={`Select ${row.email}`}
                    />
                  </TableCell>
                  {showCol("name") && (
                    <TableCell className="font-medium">
                      {row.full_name ? (
                        highlightMatch(row.full_name, searchQuery)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showCol("email") && (
                    <TableCell className="hidden sm:table-cell">{highlightMatch(row.email, searchQuery)}</TableCell>
                  )}
                  {showCol("account_type") && (
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{formatAccountType(row.account_type)}</Badge>
                    </TableCell>
                  )}
                  {showCol("mentor") && (
                    <TableCell className="hidden lg:table-cell">
                      {row.is_mentor ? (
                        <Badge variant="secondary">Mentor</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showCol("organization") && (
                    <TableCell className="hidden lg:table-cell">
                      {row.organization_name ? (
                        highlightMatch(row.organization_name, searchQuery)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showCol("active_assignments") && (
                    <TableCell className="hidden md:table-cell">
                      {row.active_assignment_count > 0 ? (
                        row.active_assignment_count
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showCol("certifications") && (
                    <TableCell className="hidden md:table-cell">
                      {row.account_type === "coach" || row.certification_count > 0 ? (
                        <span className="inline-flex items-center gap-2 text-sm">
                          {row.certification_count}
                          {row.worst_certification_status && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              {certStatusPill(row.worst_certification_status)}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showCol("status") && <TableCell>{statusBadge(row.account_status)}</TableCell>}
                  {showCol("last_login") && (
                    <TableCell className="hidden lg:table-cell">
                      {row.last_sign_in_at ? (
                        formatDistanceToNow(new Date(row.last_sign_in_at), { addSuffix: true })
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell
                    data-stop-row-click
                    onClick={(e) => e.stopPropagation()}
                    className="text-right"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRowClick(row.user_id)}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isSelf}
                          onClick={() => {
                            if (!isSelf) onImpersonate(row);
                          }}
                        >
                          Impersonate
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
  );
}
