import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import CreateManualInterventionModal from "@/components/company/CreateManualInterventionModal";
import BulkImportRecommendationsModal from "@/components/company/BulkImportRecommendationsModal";
import { rowsToCsv, downloadCsv } from "@/lib/csvUtils";
import { Download } from "lucide-react";

// ── Brand constants (mirrors CompanyDashboard / PTPDashboard) ───────────────
const NAVY = "#021F36";
const ORANGE = "#F5741A";
const PURPLE = "#3C096C";

// Source-kind chip colors
const SOURCE_KIND_LABEL: Record<string, string> = {
  narrative: "Dashboard",
  epn_delta: "NAI Leader vs Workforce",
  ptp_delta: "PTP Leader vs Workforce",
  manual: "Custom",
};
const SOURCE_KIND_COLOR: Record<string, { bg: string; color: string }> = {
  narrative: { bg: "#e8edf1", color: NAVY },
  epn_delta: { bg: "#eeedfe", color: PURPLE },
  ptp_delta: { bg: "#eeedfe", color: PURPLE },
  manual: { bg: "#fef0e7", color: ORANGE },
};

// Status badge styles
const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  not_started: { bg: "#e8edf1", color: NAVY },
  in_progress: { bg: "#fef0e7", color: ORANGE },
  completed: { bg: "#e1f5ee", color: "#0f6e56" },
  blocked: { bg: "#faece7", color: "#993c1d" },
  cancelled: { bg: "var(--muted)", color: "var(--muted-foreground)" },
};

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  high: { bg: "#faece7", color: "#993c1d" },
  medium: { bg: "#faeeda", color: "#633806" },
  low: { bg: "#e1f5ee", color: "#0f6e56" },
};

// Instrument display labels
const INSTRUMENT_LABEL: Record<string, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-002L": "Executive Perspective NAI",
};

// Friendly dimension names — fall back to the raw ID if the dimension isn't recognised
const DIM_NAMES: Record<string, string> = {
  "DIM-NAI-01": "Certainty",
  "DIM-NAI-02": "Agency",
  "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability",
  "DIM-NAI-05": "Saturation Threshold",
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};

// Format a YYYY-MM-DD date string in local time (avoiding the UTC parse off-by-one bug).
// Pass-through for any value that isn't a YYYY-MM-DD string.
function formatYmdLocal(ymd: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) {
    return new Date(ymd).toLocaleDateString("en-US", opts);
  }
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString("en-US", opts);
}

// Today's date as YYYY-MM-DD in the user's local timezone.
// Used for comparing against target_completion_date (which is also YYYY-MM-DD).
function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Types ───────────────────────────────────────────────────────────────────
type SourceKind = "narrative" | "epn_delta" | "ptp_delta" | "manual";
type StatusValue = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

interface EnrichedIntervention {
  id: string;
  organization_id: string;
  instrument_id: string;
  title: string;
  description: string;
  target_dimensions: string[];
  priority: string;
  time_horizon: string;
  intervention_type: string;
  status: StatusValue;
  tracking_notes: string | null;
  narrative_id: string | null;
  epn_delta_narrative_id: string | null;
  ptp_delta_narrative_id: string | null;
  manual_source_instrument_id: string | null;
  assigned_owner_user_id: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  last_updated_by: string | null;
  last_updated_at: string;
  created_at: string;
  source_kind: SourceKind;
  source_generated_at: string | null;
  source_slice_type: string | null;
  source_slice_value: string | null;
  owner_full_name: string | null;
  owner_email: string | null;
  days_until_target: number | null;
}

interface HistoryEntry {
  id: string;
  intervention_id: string;
  old_status: string | null;
  new_status: string;
  notes_at_change: string | null;
  changed_at: string;
  changed_by_user_id: string | null;
  changed_by_full_name: string | null;
  changed_by_email: string | null;
}

interface OrgAdmin {
  id: string;
  full_name: string | null;
  email: string;
}

function mapRow(r: any): EnrichedIntervention {
  return {
    id: r.out_id,
    organization_id: r.out_organization_id,
    instrument_id: r.out_instrument_id,
    title: r.out_title,
    description: r.out_description,
    target_dimensions: r.out_target_dimensions ?? [],
    priority: r.out_priority,
    time_horizon: r.out_time_horizon,
    intervention_type: r.out_intervention_type,
    status: r.out_status,
    tracking_notes: r.out_tracking_notes,
    narrative_id: r.out_narrative_id,
    epn_delta_narrative_id: r.out_epn_delta_narrative_id,
    ptp_delta_narrative_id: r.out_ptp_delta_narrative_id,
    manual_source_instrument_id: r.out_manual_source_instrument_id,
    assigned_owner_user_id: r.out_assigned_owner_user_id,
    target_completion_date: r.out_target_completion_date,
    actual_completion_date: r.out_actual_completion_date,
    last_updated_by: r.out_last_updated_by,
    last_updated_at: r.out_last_updated_at,
    created_at: r.out_created_at,
    source_kind: r.out_source_kind,
    source_generated_at: r.out_source_generated_at,
    source_slice_type: r.out_source_slice_type,
    source_slice_value: r.out_source_slice_value,
    owner_full_name: r.out_owner_full_name,
    owner_email: r.out_owner_email,
    days_until_target: r.out_days_until_target,
  };
}

function mapHistory(r: any): HistoryEntry {
  return {
    id: r.out_id,
    intervention_id: r.out_intervention_id,
    old_status: r.out_old_status,
    new_status: r.out_new_status,
    notes_at_change: r.out_notes_at_change,
    changed_at: r.out_changed_at,
    changed_by_user_id: r.out_changed_by_user_id,
    changed_by_full_name: r.out_changed_by_full_name,
    changed_by_email: r.out_changed_by_email,
  };
}

export default function InterventionsPage() {
  const { user } = useAuth();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<Set<StatusValue>>(
    new Set(["not_started", "in_progress"]),
  );
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showCancelled, setShowCancelled] = useState<boolean>(false);

  // Sort state
  const [sortKey, setSortKey] = useState<keyof EnrichedIntervention>("last_updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Data
  const [rows, setRows] = useState<EnrichedIntervention[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);

  // Expansion + edits
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyById, setHistoryById] = useState<Record<string, HistoryEntry[]>>({});
  const [historyOpen, setHistoryOpen] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_org_interventions", {
      p_status: null,
      p_instrument_id: null,
      p_assigned_owner: null,
      p_show_completed: true,
      p_show_cancelled: true,
    });
    if (error) {
      toast.error("Failed to load interventions");
      setRows([]);
    } else {
      setRows(((data ?? []) as any[]).map(mapRow));
    }
    setLoading(false);
  }, [user]);

  const [orgName, setOrgName] = useState("");

  const loadOrgAdmins = useCallback(async () => {
    if (!user) return;
    const { data: userRow } = await (supabase as any)
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (!userRow?.organization_id) {
      setOrgAdmins([]);
      setOrgName("");
      return;
    }
    const { data: orgRow } = await (supabase as any)
      .from("organizations")
      .select("name")
      .eq("id", userRow.organization_id)
      .single();
    setOrgName((orgRow?.name as string) ?? "");

    const { data } = await (supabase as any)
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", userRow.organization_id)
      .in("account_type", ["org_admin", "company_admin"])
      .order("full_name");
    setOrgAdmins((data ?? []) as OrgAdmin[]);
  }, [user]);

  const loadHistory = useCallback(async (interventionId: string) => {
    const { data, error } = await (supabase as any).rpc("get_org_intervention_history", {
      p_intervention_id: interventionId,
    });
    if (error) {
      toast.error("Failed to load history");
      return;
    }
    setHistoryById((prev) => ({
      ...prev,
      [interventionId]: ((data ?? []) as any[]).map(mapHistory),
    }));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    loadOrgAdmins();
  }, [loadOrgAdmins]);

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let out = rows;

    if (!showCompleted) out = out.filter((r) => r.status !== "completed");
    if (!showCancelled) out = out.filter((r) => r.status !== "cancelled");

    if (statusFilter.size > 0) {
      out = out.filter((r) => statusFilter.has(r.status));
    }

    if (sourceFilter !== "all") {
      if (sourceFilter === "manual") {
        out = out.filter((r) => r.source_kind === "manual");
      } else if (sourceFilter === "PTP_DELTA") {
        out = out.filter((r) => r.source_kind === "ptp_delta");
      } else if (sourceFilter === "INST-001") {
        out = out.filter(
          (r) =>
            (r.instrument_id === "INST-001" && r.source_kind !== "ptp_delta") ||
            r.manual_source_instrument_id === "INST-001",
        );
      } else {
        out = out.filter(
          (r) =>
            r.instrument_id === sourceFilter ||
            r.manual_source_instrument_id === sourceFilter,
        );
      }
    }

    if (ownerFilter !== "all") {
      if (ownerFilter === "me") {
        out = out.filter((r) => r.assigned_owner_user_id === user?.id);
      } else if (ownerFilter === "unassigned") {
        out = out.filter((r) => !r.assigned_owner_user_id);
      } else {
        out = out.filter((r) => r.assigned_owner_user_id === ownerFilter);
      }
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.tracking_notes ?? "").toLowerCase().includes(q),
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = (a[sortKey] ?? "") as any;
      const bv = (b[sortKey] ?? "") as any;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return out;
  }, [rows, showCompleted, showCancelled, statusFilter, sourceFilter, ownerFilter, searchText, sortKey, sortDir, user?.id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = useMemo(
    () => rows.filter((r) => r.status === "not_started" || r.status === "in_progress").length,
    [rows],
  );
  const completedThisQuarter = useMemo(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const qStart = new Date(now.getFullYear(), q * 3, 1);
    return rows.filter(
      (r) =>
        r.status === "completed" &&
        r.actual_completion_date &&
        new Date(r.actual_completion_date) >= qStart,
    ).length;
  }, [rows]);
  const overdueCount = useMemo(() => {
    const today = todayYmdLocal();
    return rows.filter(
      (r) =>
        (r.status === "not_started" || r.status === "in_progress") &&
        r.target_completion_date !== null &&
        r.target_completion_date !== undefined &&
        r.target_completion_date < today,
    ).length;
  }, [rows]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateField = async (
    interventionId: string,
    params: Record<string, any>,
  ): Promise<boolean> => {
    setSavingId(interventionId);
    const { data, error } = await (supabase as any).rpc("update_org_intervention", {
      p_intervention_id: interventionId,
      ...params,
    });
    if (error) {
      toast.error("Save failed: " + (error.message ?? "unknown"));
      setSavingId(null);
      return false;
    }
    if (data) {
      const updated = data as any;
      setRows((prev) =>
        prev.map((r) =>
          r.id === interventionId
            ? {
                ...r,
                status: updated.status,
                tracking_notes: updated.tracking_notes,
                assigned_owner_user_id: updated.assigned_owner_user_id,
                target_completion_date: updated.target_completion_date,
                actual_completion_date: updated.actual_completion_date,
                last_updated_by: updated.last_updated_by,
                last_updated_at: updated.last_updated_at,
              }
            : r,
        ),
      );
      if (historyOpen.has(interventionId)) {
        loadHistory(interventionId);
      }
    }
    setSavingId(null);
    return true;
  };

  const handleDelete = async (interventionId: string) => {
    const { error } = await (supabase as any).rpc("delete_org_intervention", {
      p_intervention_id: interventionId,
    });
    if (error) {
      toast.error("Delete failed: " + (error.message ?? "unknown"));
      return;
    }
    toast.success("Intervention deleted");
    setRows((prev) => prev.filter((r) => r.id !== interventionId));
    setExpandedId(null);
    setConfirmDeleteId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleHistory = (id: string) => {
    const isOpen = historyOpen.has(id);
    setHistoryOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!isOpen && !historyById[id]) {
      loadHistory(id);
    }
  };

  const toggleStatus = (s: StatusValue) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  // Human-readable source label combining source_kind and instrument_id.
  // Five values: PTP Dashboard, NAI Dashboard, PTP Leader vs Workforce,
  // NAI Leader vs Workforce, Custom.
  const getSourceLabel = (row: EnrichedIntervention): string => {
    if (row.source_kind === "manual") return "Custom";
    if (row.source_kind === "ptp_delta") return "PTP Leader vs Workforce";
    if (row.source_kind === "epn_delta") return "NAI Leader vs Workforce";
    if (row.source_kind === "narrative") {
      if (row.instrument_id === "INST-001") return "PTP Dashboard";
      if (row.instrument_id === "INST-002" || row.instrument_id === "INST-002L") return "NAI Dashboard";
    }
    return SOURCE_KIND_LABEL[row.source_kind] ?? row.source_kind;
  };

  // Convert a timestamp or date-string column to YYYY-MM-DD (date-only) for CSV.
  const toCsvDate = (value: string | null | undefined): string => {
    if (!value) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  };

  const slugifyOrgName = (name: string): string => {
    const slug = name
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return slug || "Organization";
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error("No interventions match the current filters.");
      return;
    }

    const headers = [
      "intervention_id",
      "title",
      "description",
      "status",
      "priority",
      "source_kind",
      "source_label",
      "instrument_id",
      "instrument_label",
      "target_dimensions",
      "time_horizon",
      "intervention_type",
      "tracking_notes",
      "assigned_owner_name",
      "assigned_owner_email",
      "target_completion_date",
      "actual_completion_date",
      "source_slice_type",
      "source_slice_value",
      "source_generated_at",
      "created_at",
      "last_updated_at",
    ];

    const rows = filteredRows.map((r) => [
      r.id,
      r.title,
      r.description,
      r.status,
      r.priority,
      r.source_kind,
      getSourceLabel(r),
      r.instrument_id,
      INSTRUMENT_LABEL[r.instrument_id] ?? r.instrument_id,
      r.target_dimensions.map((d) => DIM_NAMES[d] ?? d).join("; "),
      r.time_horizon,
      r.intervention_type,
      r.tracking_notes ?? "",
      r.owner_full_name ?? "",
      r.owner_email ?? "",
      toCsvDate(r.target_completion_date),
      toCsvDate(r.actual_completion_date),
      r.source_slice_type ?? "",
      r.source_slice_value ?? "",
      toCsvDate(r.source_generated_at),
      toCsvDate(r.created_at),
      toCsvDate(r.last_updated_at),
    ]);

    const csv = rowsToCsv(headers, rows);
    const today = new Date();
    const y = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const orgSlug = slugifyOrgName(orgName);
    const filename = `BrainWise-Interventions-${orgSlug}-${y}-${mo}-${d}.csv`;

    downloadCsv(filename, csv);
    toast.success(`Exported ${filteredRows.length} intervention${filteredRows.length === 1 ? "" : "s"}`);
  };

  const setSort = (key: keyof EnrichedIntervention) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const headerCell = (label: string, key: keyof EnrichedIntervention, width?: string) => (
    <th
      key={String(key)}
      onClick={() => setSort(key)}
      style={{
        padding: "8px 10px",
        textAlign: "left",
        fontSize: 10,
        color: "var(--muted-foreground)",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        fontWeight: 500,
        cursor: "pointer",
        userSelect: "none",
        width,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {sortKey === key && (
        <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: NAVY, margin: 0 }}>
                Intervention Tracking
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                View and manage interventions saved across all dashboards.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={handleExportCsv}
                variant="outline"
              >
                <Download />
                Export CSV
              </Button>
              <Button
                onClick={() => setBulkImportOpen(true)}
                variant="outline"
              >
                <Plus />
                Bulk import recommendations
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                style={{ background: NAVY, color: "#fff" }}
              >
                <Plus />
                Create custom intervention
              </Button>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
            {[
              { label: "Active", value: activeCount, sub: "not started + in progress", color: NAVY },
              { label: "Completed this quarter", value: completedThisQuarter, sub: "since quarter start", color: "#0f6e56" },
              { label: "Overdue", value: overdueCount, sub: "past target date, not done", color: overdueCount > 0 ? "#993c1d" : NAVY },
            ].map((c) => (
              <div key={c.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: c.color, marginTop: 2 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.4 }}>Status:</span>
            {(["not_started", "in_progress", "blocked", "completed", "cancelled"] as StatusValue[]).map((s) => {
              const active = statusFilter.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                    border: `0.5px solid ${active ? NAVY : "var(--border)"}`,
                    background: active ? "#e8edf1" : "var(--muted)",
                    color: active ? NAVY : "var(--muted-foreground)",
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}

            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
            >
              <option value="all">Source ▾ (all)</option>
              <option value="INST-002">NAI Dashboard</option>
              <option value="INST-002L">NAI Leader vs Workforce</option>
              <option value="INST-001">PTP Dashboard</option>
              <option value="PTP_DELTA">PTP Leader vs Workforce</option>
              <option value="manual">Custom (manual)</option>
            </select>

            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
            >
              <option value="all">Owner ▾ (all)</option>
              <option value="me">Me</option>
              <option value="unassigned">Unassigned</option>
              {orgAdmins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search title, description, notes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                border: "0.5px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", minWidth: 220, flex: "1 1 200px", maxWidth: 320,
              }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)", cursor: "pointer" }}>
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
              Show completed
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)", cursor: "pointer" }}>
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
              Show cancelled
            </label>
            <button
              onClick={loadList}
              style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 10px", borderRadius: 20,
                border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", cursor: "pointer",
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            Loading interventions…
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
            <div style={{ fontSize: 14, color: NAVY, fontWeight: 500, marginBottom: 6 }}>
              {rows.length === 0 ? "No interventions tracked yet" : "No matches for these filters"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {rows.length === 0
                ? "Save interventions from the NAI or PTP dashboards, or create a custom intervention here."
                : "Try clearing filters or searching for different text."}
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead style={{ background: "var(--muted)" }}>
                <tr>
                  <th style={{ width: 32 }} />
                  {headerCell("Title", "title")}
                  {headerCell("Status", "status", "120px")}
                  {headerCell("Source", "source_kind", "180px")}
                  {headerCell("Priority", "priority", "90px")}
                  {headerCell("Target date", "target_completion_date", "120px")}
                  {headerCell("Owner", "owner_full_name", "140px")}
                  {headerCell("Last updated", "last_updated_at", "120px")}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const isOpen = expandedId === r.id;
                  const today = todayYmdLocal();
                  const overdue = !!(
                    (r.status === "not_started" || r.status === "in_progress") &&
                    r.target_completion_date &&
                    r.target_completion_date < today
                  );
                  return (
                    <FragmentRow
                      key={r.id}
                      row={r}
                      isOpen={isOpen}
                      overdue={overdue}
                      striped={i % 2 === 1}
                      orgAdmins={orgAdmins}
                      saving={savingId === r.id}
                      history={historyById[r.id]}
                      historyOpen={historyOpen.has(r.id)}
                      confirmDelete={confirmDeleteId === r.id}
                      onToggle={() => toggleExpand(r.id)}
                      onUpdate={(params) => updateField(r.id, params)}
                      onToggleHistory={() => toggleHistory(r.id)}
                      onConfirmDelete={() => setConfirmDeleteId(r.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateManualInterventionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={loadList}
        orgAdmins={orgAdmins}
      />
      <BulkImportRecommendationsModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImported={loadList}
      />
    </TooltipProvider>
  );
}

// ── Row + detail panel ──────────────────────────────────────────────────────
function FragmentRow(props: {
  row: EnrichedIntervention;
  isOpen: boolean;
  overdue: boolean;
  striped: boolean;
  orgAdmins: OrgAdmin[];
  saving: boolean;
  history: HistoryEntry[] | undefined;
  historyOpen: boolean;
  confirmDelete: boolean;
  onToggle: () => void;
  onUpdate: (params: Record<string, any>) => Promise<boolean>;
  onToggleHistory: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const { row: r, isOpen, overdue, striped, orgAdmins, saving } = props;

  const [statusDraft, setStatusDraft] = useState<StatusValue>(r.status);
  const [ownerDraft, setOwnerDraft] = useState<string>(r.assigned_owner_user_id ?? "");
  const [targetDraft, setTargetDraft] = useState<string>(r.target_completion_date ?? "");
  const [actualDraft, setActualDraft] = useState<string>(r.actual_completion_date ?? "");
  const [notesDraft, setNotesDraft] = useState<string>(r.tracking_notes ?? "");

  useEffect(() => {
    setStatusDraft(r.status);
    setOwnerDraft(r.assigned_owner_user_id ?? "");
    setTargetDraft(r.target_completion_date ?? "");
    setActualDraft(r.actual_completion_date ?? "");
    setNotesDraft(r.tracking_notes ?? "");
  }, [r.status, r.assigned_owner_user_id, r.target_completion_date, r.actual_completion_date, r.tracking_notes]);

  const statusStyle = STATUS_COLOR[r.status] ?? { bg: "var(--muted)", color: "var(--muted-foreground)" };
  const sourceStyle = SOURCE_KIND_COLOR[r.source_kind];
  const priorityStyle = PRIORITY_COLOR[r.priority] ?? PRIORITY_COLOR.medium;

  const cellStyle: React.CSSProperties = {
    padding: "10px 10px",
    fontSize: 12,
    color: "var(--foreground)",
    borderTop: "0.5px solid var(--border)",
    verticalAlign: "top",
  };

  return (
    <>
      <tr
        onClick={props.onToggle}
        style={{ cursor: "pointer", background: striped ? "var(--muted)" : "transparent" }}
      >
        <td style={{ ...cellStyle, padding: "10px 4px 10px 10px" }}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td style={cellStyle}>
          <div style={{ fontWeight: 500, color: NAVY, lineHeight: 1.3 }}>{r.title}</div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
            {r.target_dimensions.length > 0 && r.target_dimensions.map((d) => DIM_NAMES[d] ?? d).join(" · ")}
          </div>
        </td>
        <td style={cellStyle}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: statusStyle.bg, color: statusStyle.color, fontWeight: 500 }}>
            {STATUS_LABEL[r.status]}
          </span>
        </td>
        <td style={cellStyle}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: sourceStyle.bg, color: sourceStyle.color, fontWeight: 500, whiteSpace: "nowrap", display: "inline-block" }}>
            {SOURCE_KIND_LABEL[r.source_kind]}
          </span>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>
            {INSTRUMENT_LABEL[r.instrument_id] ?? r.instrument_id}
          </div>
        </td>
        <td style={cellStyle}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: priorityStyle.bg, color: priorityStyle.color, fontWeight: 500, textTransform: "capitalize" }}>
            {r.priority}
          </span>
        </td>
        <td style={cellStyle}>
          {r.target_completion_date
            ? formatYmdLocal(r.target_completion_date)
            : <span style={{ color: "var(--muted-foreground)" }}>—</span>}
          {overdue && (
            <span style={{ display: "block", fontSize: 9, color: "#993c1d", fontWeight: 600, marginTop: 2 }}>OVERDUE</span>
          )}
        </td>
        <td style={cellStyle}>
          {r.owner_full_name || r.owner_email || <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>Unassigned</span>}
        </td>
        <td style={cellStyle}>
          {new Date(r.last_updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </td>
      </tr>

      {isOpen && (
        <tr style={{ background: striped ? "var(--muted)" : "transparent" }}>
          <td colSpan={8} style={{ padding: 0, borderTop: "0.5px solid var(--border)" }}>
            <div style={{ padding: "16px 20px 18px 42px" }}>
              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Description
                </div>
                <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {r.description}
                </div>
              </div>

              {/* Source info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11, color: "var(--muted-foreground)", marginBottom: 14 }}>
                <span>
                  <strong style={{ color: NAVY, fontWeight: 500 }}>Source:</strong>{" "}
                  {SOURCE_KIND_LABEL[r.source_kind]} · {INSTRUMENT_LABEL[r.instrument_id] ?? r.instrument_id}
                </span>
                {r.source_generated_at && (
                  <span>
                    <strong style={{ color: NAVY, fontWeight: 500 }}>Generated:</strong>{" "}
                    {new Date(r.source_generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                {r.source_slice_type && (
                  <span>
                    <strong style={{ color: NAVY, fontWeight: 500 }}>Slice:</strong>{" "}
                    {r.source_slice_type === "all" ? "All organization" : `${r.source_slice_type}: ${r.source_slice_value}`}
                  </span>
                )}
                <span>
                  <strong style={{ color: NAVY, fontWeight: 500 }}>Time horizon:</strong>{" "}
                  {r.time_horizon}
                </span>
                <span>
                  <strong style={{ color: NAVY, fontWeight: 500 }}>Type:</strong>{" "}
                  {r.intervention_type}
                </span>
                {r.target_dimensions.length > 0 && (
                  <span>
                    <strong style={{ color: NAVY, fontWeight: 500 }}>Target dimensions:</strong>{" "}
                    {r.target_dimensions.map((d) => DIM_NAMES[d] ?? d).join(" · ")}
                  </span>
                )}
              </div>

              {/* Editable grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
                <Field label="Status">
                  <select
                    value={statusDraft}
                    onChange={async (e) => {
                      const v = e.target.value as StatusValue;
                      setStatusDraft(v);
                      const params: Record<string, any> = { p_status: v };
                      if (v === "completed" && !r.actual_completion_date) {
                        const today = new Date().toISOString().slice(0, 10);
                        params.p_actual_completion_date = today;
                        setActualDraft(today);
                      }
                      if (v !== "completed" && r.actual_completion_date) {
                        params.p_clear_actual_date = true;
                        setActualDraft("");
                      }
                      await props.onUpdate(params);
                    }}
                    style={inputStyle}
                  >
                    {(["not_started", "in_progress", "blocked", "completed", "cancelled"] as StatusValue[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Owner">
                  <select
                    value={ownerDraft}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setOwnerDraft(v);
                      if (v === "") {
                        await props.onUpdate({ p_clear_owner: true });
                      } else {
                        await props.onUpdate({ p_assigned_owner_user_id: v });
                      }
                    }}
                    style={inputStyle}
                  >
                    <option value="">Unassigned</option>
                    {orgAdmins.map((a) => (
                      <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Target date">
                  <input
                    type="date"
                    value={targetDraft}
                    onChange={(e) => setTargetDraft(e.target.value)}
                    onBlur={async () => {
                      if (targetDraft === (r.target_completion_date ?? "")) return;
                      if (targetDraft === "") {
                        await props.onUpdate({ p_clear_target_date: true });
                      } else {
                        await props.onUpdate({ p_target_completion_date: targetDraft });
                      }
                    }}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Actual completion">
                  <input
                    type="date"
                    value={actualDraft}
                    disabled={r.status !== "completed"}
                    onChange={(e) => setActualDraft(e.target.value)}
                    onBlur={async () => {
                      if (actualDraft === (r.actual_completion_date ?? "")) return;
                      if (actualDraft === "") {
                        await props.onUpdate({ p_clear_actual_date: true });
                      } else {
                        await props.onUpdate({ p_actual_completion_date: actualDraft });
                      }
                    }}
                    style={{ ...inputStyle, opacity: r.status === "completed" ? 1 : 0.5 }}
                  />
                </Field>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Tracking notes
                </div>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={async () => {
                    if (notesDraft === (r.tracking_notes ?? "")) return;
                    if (notesDraft.trim() === "") {
                      await props.onUpdate({ p_clear_notes: true });
                    } else {
                      await props.onUpdate({ p_tracking_notes: notesDraft });
                    }
                  }}
                  placeholder="Add context, blockers, or next steps..."
                  style={{
                    ...inputStyle,
                    minHeight: 72, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Audit log */}
              <div style={{ marginBottom: 14, background: "var(--card)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
                <button
                  onClick={props.onToggleHistory}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    background: "none", border: "none", cursor: "pointer", padding: "10px 12px",
                    fontSize: 12, color: NAVY, fontWeight: 500, textAlign: "left",
                  }}
                >
                  {props.historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Audit log
                  {props.history && (
                    <span style={{ marginLeft: 4, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}>
                      ({props.history.length} {props.history.length === 1 ? "change" : "changes"})
                    </span>
                  )}
                </button>
                {props.historyOpen && (
                  <div style={{ borderTop: "0.5px solid var(--border)", padding: "10px 12px" }}>
                    {!props.history ? (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Loading…</div>
                    ) : props.history.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>No status changes recorded yet.</div>
                    ) : (
                      props.history.map((h) => (
                        <div key={h.id} style={{ fontSize: 12, color: "var(--foreground)", padding: "6px 0", borderBottom: "0.5px dashed var(--border)" }}>
                          <span style={{ color: STATUS_COLOR[h.old_status ?? ""]?.color ?? "var(--muted-foreground)" }}>
                            {h.old_status ? STATUS_LABEL[h.old_status] : "—"}
                          </span>
                          <span style={{ color: "var(--muted-foreground)", margin: "0 6px" }}>→</span>
                          <span style={{ color: STATUS_COLOR[h.new_status]?.color ?? NAVY, fontWeight: 500 }}>
                            {STATUS_LABEL[h.new_status]}
                          </span>
                          <span style={{ color: "var(--muted-foreground)", marginLeft: 8 }}>
                            by {h.changed_by_full_name || h.changed_by_email || "unknown"}
                            {" · "}
                            {new Date(h.changed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {h.notes_at_change && (
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, fontStyle: "italic" }}>
                              "{h.notes_at_change}"
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {saving ? "Saving…" : "Changes save automatically"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {props.confirmDelete ? (
                    <>
                      <span style={{ fontSize: 12, color: "#993c1d", alignSelf: "center" }}>Delete this intervention?</span>
                      <Button size="sm" variant="outline" onClick={props.onCancelDelete}>Cancel</Button>
                      <Button
                        size="sm"
                        onClick={props.onDelete}
                        style={{ background: "#993c1d", color: "#fff" }}
                      >
                        Yes, delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={props.onConfirmDelete}
                      style={{ borderColor: "#993c1d", color: "#993c1d" }}
                    >
                      <Trash2 style={{ marginRight: 6 }} />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  padding: "6px 9px",
  border: "0.5px solid var(--border)",
  borderRadius: 7,
  background: "var(--card)",
  color: "var(--foreground)",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
