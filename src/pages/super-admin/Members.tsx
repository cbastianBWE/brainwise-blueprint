import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MembersTable from "@/components/members/MembersTable";
import MembersFilterBar from "@/components/members/MembersFilterBar";
import MembersBulkActionsBar from "@/components/members/MembersBulkActionsBar";
import ColumnVisibilityMenu from "@/components/members/ColumnVisibilityMenu";
import MemberDrawer from "@/components/members/MemberDrawer";
import JustificationModal from "@/components/impersonation/JustificationModal";
import {
  MEMBER_COLUMN_IDS,
  SYSTEM_DEFAULT_COLUMNS,
  SYSTEM_DEFAULT_FILTERS,
  SYSTEM_DEFAULT_SORT,
  type MemberColumnId,
  type MemberRow,
  type MembersFilterState,
  type MembersSortState,
  type MembersUiPreferences,
  type SavedView,
} from "@/components/members/types";

const PAGE_SIZE = 25;
type TabId = "learning" | "assignments" | "coach" | "audit";
const VALID_TABS: TabId[] = ["learning", "assignments", "coach", "audit"];

// Inline by design — cycle 2a will extract to a hook.
function membersQueryKey(
  query: string,
  filters: MembersFilterState,
  sort: MembersSortState,
  page: number,
): unknown[] {
  const normalizedFilters: Record<string, unknown> = {};
  for (const k of Object.keys(filters).sort()) {
    const v = (filters as any)[k];
    normalizedFilters[k] = Array.isArray(v) ? [...v].sort() : v;
  }
  return ["members-search", { query, filters: normalizedFilters, sort, page }];
}

function filtersEqual(a: MembersFilterState, b: MembersFilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sortEqual(a: MembersSortState, b: MembersSortState): boolean {
  return a.column === b.column && a.direction === b.direction;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function countChanges(
  view: SavedView,
  filters: MembersFilterState,
  sort: MembersSortState,
  columns: MemberColumnId[],
): number {
  let n = 0;
  for (const k of Object.keys(view.filters) as (keyof MembersFilterState)[]) {
    if (JSON.stringify(view.filters[k]) !== JSON.stringify(filters[k])) n++;
  }
  if (!sortEqual(view.sort, sort)) n++;
  if (!arraysEqual(view.columns, columns)) n++;
  return n;
}

export default function Members() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUserId = user?.id;
  const fullPageMode = !!routeUserId;

  // Search / pagination / sort / multi-select state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<MembersFilterState>(SYSTEM_DEFAULT_FILTERS);
  const [sort, setSort] = useState<MembersSortState>(SYSTEM_DEFAULT_SORT);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] =
    useState<MemberColumnId[]>(SYSTEM_DEFAULT_COLUMNS);

  // Impersonation modal target
  const [impersonateTarget, setImpersonateTarget] = useState<MemberRow | null>(null);

  // Saved views (loaded from ui_preferences)
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Debounce search
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, filters, sort]);

  // Load ui_preferences once.
  useEffect(() => {
    if (!currentUserId || prefsLoaded) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("ui_preferences")
        .eq("id", currentUserId)
        .single();
      const prefs = (data?.ui_preferences ?? {}) as any;
      const block = prefs?.members;
      if (block?.version === 1) {
        const views: SavedView[] = Array.isArray(block.saved_views) ? block.saved_views : [];
        setSavedViews(views);
        const def = block.default_view ?? null;
        const initial = views.find((v) => v.id === def);
        if (initial) {
          setActiveViewId(initial.id);
          setFilters(initial.filters);
          setSort(initial.sort);
          setVisibleColumns(
            (initial.columns as MemberColumnId[]).filter((c) =>
              MEMBER_COLUMN_IDS.includes(c as MemberColumnId),
            ),
          );
        }
      }
      setPrefsLoaded(true);
    })();
  }, [currentUserId, prefsLoaded]);

  // Detached calculation
  const activeView = savedViews.find((v) => v.id === activeViewId) ?? null;
  const detached =
    !!activeView &&
    (!filtersEqual(activeView.filters, filters) ||
      !sortEqual(activeView.sort, sort) ||
      !arraysEqual(activeView.columns, visibleColumns));
  const changesCount = activeView
    ? countChanges(activeView, filters, sort, visibleColumns)
    : 0;

  // Query members
  const { data: rows, isLoading, error } = useQuery({
    queryKey: membersQueryKey(debouncedQuery, filters, sort, page),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: debouncedQuery.length >= 2 ? debouncedQuery : null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
        p_account_types: filters.account_types,
        p_is_mentor: filters.is_mentor,
        p_account_status_in: filters.account_status_in,
        p_has_active_assignments: filters.has_active_assignments,
        p_organization_ids: filters.organization_ids,
        p_certification_statuses: filters.certification_statuses,
        p_last_active_within: filters.last_active_within_days
          ? `${filters.last_active_within_days} days`
          : null,
        p_created_within: filters.created_within_days
          ? `${filters.created_within_days} days`
          : null,
        p_has_supervisor: filters.has_supervisor,
        p_sort_column: sort.column,
        p_sort_direction: sort.direction,
        p_specific_user_id: null,
      } as any);
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
    },
    enabled: true,
    staleTime: 30_000,
  });

  const totalCount = Number(rows?.[0]?.total_count ?? 0);
  const showPagination = totalCount > PAGE_SIZE;

  // Drawer state derived from URL.
  const drawerUserId = searchParams.get("member");
  const rawTab = searchParams.get("tab");
  const activeTab: TabId = (VALID_TABS.includes(rawTab as TabId) ? rawTab : "learning") as TabId;

  // Find member for drawer/full-page. For drawer, must be in current rows.
  const drawerMember = useMemo<MemberRow | null>(() => {
    const id = fullPageMode ? routeUserId! : drawerUserId;
    if (!id) return null;
    return rows?.find((r) => r.user_id === id) ?? null;
  }, [rows, drawerUserId, routeUserId, fullPageMode]);

  // Full-page mode: if user not in current page, fetch directly.
  const { data: directMember } = useQuery({
    queryKey: ["member-direct", routeUserId],
    enabled: fullPageMode && !drawerMember && !!routeUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: null,
        p_limit: 1,
        p_offset: 0,
        p_account_types: null,
        p_is_mentor: null,
        p_account_status_in: null,
        p_has_active_assignments: null,
        p_organization_ids: null,
        p_certification_statuses: null,
        p_last_active_within: null,
        p_created_within: null,
        p_has_supervisor: null,
        p_sort_column: null,
        p_sort_direction: null,
        p_specific_user_id: routeUserId,
      } as any);
      if (error) throw error;
      const arr = (data ?? []) as unknown as MemberRow[];
      return arr[0] ?? null;
    },
  });

  const effectiveMember = drawerMember ?? directMember ?? null;

  // Handlers
  const handleOpenDrawer = (uid: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("member", uid);
    setSearchParams(next, { replace: false });
  };

  const handleCloseDrawer = () => {
    if (fullPageMode) {
      navigate("/super-admin/members");
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("member");
    next.delete("tab");
    setSearchParams(next, { replace: false });
  };

  const handleTabChange = (tab: TabId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const handleSortChange = (column: MembersSortState["column"]) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  };

  const handleToggleSelect = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const pageIds = (rows ?? []).map((r) => r.user_id);
    setSelectedIds((prev) => {
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // ui_preferences whole-blob write (read-merge-write).
  // DO NOT use jsonb_set, ||, or partial RPCs. §122.
  const persistPrefs = async (nextBlock: MembersUiPreferences) => {
    if (!currentUserId) return;
    const { data: row } = await supabase
      .from("users")
      .select("ui_preferences")
      .eq("id", currentUserId)
      .single();
    const prefs = (row?.ui_preferences ?? {}) as Record<string, unknown>;
    const next = { ...prefs, members: nextBlock };
    const { error: updErr } = await supabase
      .from("users")
      .update({ ui_preferences: next as any })
      .eq("id", currentUserId);
    if (updErr) {
      toast({ title: "Failed to save view", description: updErr.message, variant: "destructive" });
    }
  };

  const handleSaveAsNew = async (name: string) => {
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name,
      filters,
      sort,
      columns: visibleColumns,
    };
    const next = [...savedViews, newView];
    setSavedViews(next);
    setActiveViewId(newView.id);
    await persistPrefs({ version: 1, default_view: newView.id, saved_views: next });
    toast({ title: `Saved view "${name}"` });
  };

  const handleUpdateCurrent = async () => {
    if (!activeViewId) return;
    const next = savedViews.map((v) =>
      v.id === activeViewId ? { ...v, filters, sort, columns: visibleColumns } : v,
    );
    setSavedViews(next);
    await persistPrefs({ version: 1, default_view: activeViewId, saved_views: next });
    toast({ title: "View updated" });
  };

  const handleSelectView = (viewId: string) => {
    const v = savedViews.find((x) => x.id === viewId);
    if (!v) return;
    setActiveViewId(viewId);
    setFilters(v.filters);
    setSort(v.sort);
    setVisibleColumns(
      (v.columns as MemberColumnId[]).filter((c) =>
        MEMBER_COLUMN_IDS.includes(c as MemberColumnId),
      ),
    );
  };

  const handleDiscardChanges = () => {
    if (!activeView) return;
    setFilters(activeView.filters);
    setSort(activeView.sort);
    setVisibleColumns(
      (activeView.columns as MemberColumnId[]).filter((c) =>
        MEMBER_COLUMN_IDS.includes(c as MemberColumnId),
      ),
    );
  };

  // Full-page mode renders just the drawer body.
  if (fullPageMode) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/members")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Members
          </Button>
        </div>
        <MemberDrawer
          open
          embedded
          member={effectiveMember}
          activeTab={activeTab}
          currentUserId={currentUserId}
          onTabChange={handleTabChange}
          onClose={() => navigate("/super-admin/members")}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse, search, and manage all platform members.
        </p>
      </div>

      <MembersFilterBar
        searchQuery={query}
        onSearchChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        savedViews={savedViews}
        activeViewId={activeViewId}
        detached={detached}
        changesCount={changesCount}
        onSelectView={handleSelectView}
        onSaveAsNew={handleSaveAsNew}
        onUpdateCurrent={handleUpdateCurrent}
        onDiscardChanges={handleDiscardChanges}
        rightSlot={
          <ColumnVisibilityMenu
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
          />
        }
      />

      <MembersBulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
      />

      <MembersTable
        rows={rows}
        isLoading={isLoading}
        error={error}
        selectedIds={selectedIds}
        sort={sort}
        searchQuery={debouncedQuery}
        visibleColumns={visibleColumns}
        currentUserId={currentUserId}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSortChange={handleSortChange}
        onRowClick={handleOpenDrawer}
        onImpersonate={(row) => setImpersonateTarget(row)}
      />

      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} ·{" "}
            {totalCount.toLocaleString()} members
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <MemberDrawer
        open={!!drawerUserId}
        member={effectiveMember}
        activeTab={activeTab}
        currentUserId={currentUserId}
        onTabChange={handleTabChange}
        onClose={handleCloseDrawer}
      />

      <JustificationModal
        target={
          impersonateTarget
            ? {
                user_id: impersonateTarget.user_id,
                email: impersonateTarget.email,
                full_name: impersonateTarget.full_name,
                account_type: impersonateTarget.account_type,
              }
            : null
        }
        onClose={() => setImpersonateTarget(null)}
      />
    </div>
  );
}
