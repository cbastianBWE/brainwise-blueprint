import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";

const NAVY = "#021F36";
const ORANGE = "#F5741A";
const PURPLE = "#3C096C";

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

const INSTRUMENT_LABEL: Record<string, string> = {
  "INST-001": "PTP Dashboard",
  "INST-002": "NAI Dashboard",
  "INST-002L": "NAI Dashboard — Leader vs Workforce",
};

const PTP_DELTA_LABEL = "PTP Dashboard — Leader vs Workforce";

const SOURCE_KIND_COLOR: Record<string, { bg: string; color: string }> = {
  narrative: { bg: "#e8edf1", color: NAVY },
  epn_delta: { bg: "#eeedfe", color: PURPLE },
  ptp_delta: { bg: "#eeedfe", color: PURPLE },
};

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  high: { bg: "#faece7", color: "#993c1d" },
  medium: { bg: "#faeeda", color: "#633806" },
  low: { bg: "#e1f5ee", color: "#0f6e56" },
};

interface AvailableRec {
  source_kind: "narrative" | "epn_delta" | "ptp_delta";
  narrative_id: string | null;
  epn_delta_narrative_id: string | null;
  ptp_delta_narrative_id: string | null;
  instrument_id: string;
  slice_type: string;
  slice_value: string;
  generated_at: string;
  participant_count: number;
  rec_index: number;
  title: string;
  description: string;
  target_dimensions: string[];
  priority: string;
  time_horizon: string;
  intervention_type: string;
  already_tracked: boolean;
}

function mapRow(r: any): AvailableRec {
  return {
    source_kind: r.out_source_kind,
    narrative_id: r.out_narrative_id,
    epn_delta_narrative_id: r.out_epn_delta_narrative_id,
    ptp_delta_narrative_id: r.out_ptp_delta_narrative_id,
    instrument_id: r.out_instrument_id,
    slice_type: r.out_slice_type,
    slice_value: r.out_slice_value,
    generated_at: r.out_generated_at,
    participant_count: r.out_participant_count,
    rec_index: r.out_rec_index,
    title: r.out_title,
    description: r.out_description,
    target_dimensions: r.out_target_dimensions ?? [],
    priority: r.out_priority,
    time_horizon: r.out_time_horizon,
    intervention_type: r.out_intervention_type,
    already_tracked: r.out_already_tracked,
  };
}

function rowKey(rec: AvailableRec): string {
  const id = rec.narrative_id ?? rec.epn_delta_narrative_id ?? "none";
  return `${rec.source_kind}|${id}|${rec.rec_index}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function BulkImportRecommendationsModal({ open, onClose, onImported }: Props) {
  const [rows, setRows] = useState<AvailableRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [sourceFilter, setSourceFilter] = useState("all");
  const [sliceFilter, setSliceFilter] = useState("all");
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [hideAlreadyTracked, setHideAlreadyTracked] = useState(true);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_available_recommendations");
    if (error) {
      toast.error("Failed to load recommendations: " + (error.message ?? "unknown"));
      setRows([]);
    } else {
      setRows(((data ?? []) as any[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadRows();
      setSelected(new Set());
    }
  }, [open, loadRows]);

  const sliceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      const key = `${r.slice_type}:${r.slice_value}`;
      const label = r.slice_type === "all" ? "All organization" : `${r.slice_type}: ${r.slice_value}`;
      if (!seen.has(key)) seen.set(key, label);
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, [rows]);

  const dimensionOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) {
      for (const d of r.target_dimensions) seen.add(d);
    }
    return Array.from(seen).sort().map((d) => ({ key: d, label: DIM_NAMES[d] ?? d }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (hideAlreadyTracked && r.already_tracked) return false;
      if (sourceFilter !== "all") {
        if (sourceFilter === "PTP_DELTA") {
          if (r.source_kind !== "ptp_delta") return false;
        } else if (sourceFilter === "INST-001") {
          if (r.instrument_id !== "INST-001" || r.source_kind === "ptp_delta") return false;
        } else {
          if (r.instrument_id !== sourceFilter) return false;
        }
      }
      if (sliceFilter !== "all" && `${r.slice_type}:${r.slice_value}` !== sliceFilter) return false;
      if (dimensionFilter !== "all" && !r.target_dimensions.includes(dimensionFilter)) return false;
      return true;
    });
  }, [rows, hideAlreadyTracked, sourceFilter, sliceFilter, dimensionFilter]);

  const totalAvailable = rows.length;
  const totalAlreadyTracked = rows.filter((r) => r.already_tracked).length;
  const visibleCount = filtered.length;
  const selectedCount = useMemo(() => {
    let n = 0;
    for (const r of filtered) {
      if (selected.has(rowKey(r))) n++;
    }
    return n;
  }, [filtered, selected]);

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const importSelected = async () => {
    const toImport = filtered.filter((r) => selected.has(rowKey(r)));
    if (toImport.length === 0) {
      toast.error("Select at least one recommendation to import.");
      return;
    }
    setImporting(true);
    let successes = 0;
    const failures: Array<{ title: string; reason: string }> = [];
    for (const rec of toImport) {
      const rpcParams: any = {
        p_narrative_id: rec.source_kind === "narrative" ? rec.narrative_id : null,
        p_epn_delta_narrative_id: rec.source_kind === "epn_delta" ? rec.epn_delta_narrative_id : null,
        p_ptp_delta_narrative_id: rec.source_kind === "ptp_delta" ? rec.ptp_delta_narrative_id : null,
        p_instrument_id: rec.instrument_id,
        p_title: rec.title,
        p_description: rec.description,
        p_target_dimensions: rec.target_dimensions,
        p_priority: rec.priority,
        p_time_horizon: rec.time_horizon,
        p_intervention_type: rec.intervention_type,
        p_status: "not_started",
        p_tracking_notes: null,
      };
      const { error } = await (supabase as any).rpc("save_org_intervention", rpcParams);
      if (error) {
        failures.push({ title: rec.title, reason: error.message ?? "unknown" });
      } else {
        successes++;
      }
    }
    setImporting(false);
    if (successes > 0) {
      toast.success(`Imported ${successes} of ${toImport.length} recommendation${toImport.length === 1 ? "" : "s"}`);
      onImported();
    }
    if (failures.length > 0) {
      const msg = failures.map((f) => `"${f.title.slice(0, 40)}…": ${f.reason}`).join("; ");
      toast.error(`${failures.length} failed: ${msg}`);
    }
    if (failures.length === 0) {
      onClose();
    } else {
      loadRows();
      setSelected(new Set());
    }
  };

  if (!open) return null;

  const selectStyle: React.CSSProperties = {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 20,
    border: "0.5px solid var(--border)",
    background: "var(--card)",
    color: "var(--foreground)",
    cursor: "pointer",
  };

  return (
    <div
      onClick={() => !importing && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 0,
          width: 920,
          maxWidth: "96vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          border: "0.5px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 12px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Phase 6 · Bulk import
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: NAVY, margin: 0 }}>Import recommendations</h2>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0", maxWidth: 640 }}>
              Latest AI-generated recommendations across all dashboards. Select per row to import.
            </p>
          </div>
          <button
            onClick={() => !importing && onClose()}
            disabled={importing}
            style={{ background: "transparent", border: "none", color: NAVY, cursor: importing ? "default" : "pointer", padding: 0 }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ padding: "12px 22px", borderBottom: "0.5px solid var(--border)", background: "var(--muted)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
              <option value="all">Source ▾ (all)</option>
              <option value="INST-002">NAI Dashboard</option>
              <option value="INST-002L">NAI Dashboard — Leader vs Workforce</option>
              <option value="INST-001">PTP Dashboard</option>
              <option value="PTP_DELTA">PTP Dashboard — Leader vs Workforce</option>
            </select>

            <select value={sliceFilter} onChange={(e) => setSliceFilter(e.target.value)} style={selectStyle}>
              <option value="all">Slice ▾ (all)</option>
              {sliceOptions.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            <select value={dimensionFilter} onChange={(e) => setDimensionFilter(e.target.value)} style={selectStyle}>
              <option value="all">Dimension ▾ (all)</option>
              {dimensionOptions.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: NAVY, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hideAlreadyTracked}
                onChange={(e) => setHideAlreadyTracked(e.target.checked)}
              />
              Hide already-tracked ({totalAlreadyTracked})
            </label>

            <button
              onClick={loadRows}
              disabled={loading}
              style={{ ...selectStyle, display: "inline-flex", alignItems: "center", gap: 4, cursor: loading ? "default" : "pointer" }}
            >
              <RefreshCw size={11} />
              Refresh
            </button>

            <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>
              Showing {visibleCount} of {totalAvailable} · {selectedCount} selected
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 22px" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
              Loading recommendations…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
              {rows.length === 0
                ? "No recommendations available yet. Generate dashboard narratives first."
                : "No matches for these filters."}
            </div>
          ) : (
            filtered.map((rec) => {
              const key = rowKey(rec);
              const checked = selected.has(key);
              const sourceStyle = SOURCE_KIND_COLOR[rec.source_kind] ?? SOURCE_KIND_COLOR.narrative;
              const priStyle = PRIORITY_COLOR[rec.priority] ?? PRIORITY_COLOR.medium;
              return (
                <div
                  key={key}
                  onClick={() => toggleRow(key)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    border: `0.5px solid ${checked ? NAVY : "var(--border)"}`,
                    borderRadius: 8,
                    background: checked ? "#e8edf1" : "var(--card)",
                    cursor: "pointer",
                    opacity: rec.already_tracked ? 0.7 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRow(key)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 4, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{rec.title}</div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: sourceStyle.bg, color: sourceStyle.color, fontWeight: 500 }}>
                          {rec.source_kind === "ptp_delta"
                            ? PTP_DELTA_LABEL
                            : (INSTRUMENT_LABEL[rec.instrument_id] ?? rec.instrument_id)}
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: priStyle.bg, color: priStyle.color, fontWeight: 500, textTransform: "capitalize" }}>
                          {rec.priority}
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 500 }}>
                          {rec.time_horizon}
                        </span>
                        {rec.already_tracked && (
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#e1f5ee", color: "#0f6e56", fontWeight: 500 }}>
                            Tracked
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 6 }}>
                      {rec.slice_type === "all" ? "All organization" : `${rec.slice_type}: ${rec.slice_value}`}
                      {" · Generated "}
                      {new Date(rec.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · n="}{rec.participant_count}
                      {rec.target_dimensions.length > 0 && (
                        <> · {rec.target_dimensions.map((d) => DIM_NAMES[d] ?? d).join(" · ")}</>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: NAVY, lineHeight: 1.5 }}>
                      {rec.description.length > 280 ? rec.description.slice(0, 280) + "…" : rec.description}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {selectedCount > 0
              ? `${selectedCount} recommendation${selectedCount === 1 ? "" : "s"} will be imported with status "not started"`
              : "Click any row to select it for import"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => !importing && onClose()} disabled={importing}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={importSelected}
              disabled={importing || selectedCount === 0}
              style={{ background: NAVY, color: "#fff" }}
            >
              {importing ? "Importing…" : `Import selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
