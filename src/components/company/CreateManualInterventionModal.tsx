import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const NAVY = "#021F36";

const INSTRUMENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "INST-002", label: "NAI Dashboard" },
  { value: "INST-001", label: "PTP Dashboard" },
];

const NAI_DIMENSIONS: Array<{ id: string; label: string }> = [
  { id: "DIM-NAI-01", label: "Certainty" },
  { id: "DIM-NAI-02", label: "Agency" },
  { id: "DIM-NAI-03", label: "Fairness" },
  { id: "DIM-NAI-04", label: "Ego Stability" },
  { id: "DIM-NAI-05", label: "Saturation Threshold" },
];

const PTP_DIMENSIONS: Array<{ id: string; label: string }> = [
  { id: "DIM-PTP-01", label: "Protection" },
  { id: "DIM-PTP-02", label: "Participation" },
  { id: "DIM-PTP-03", label: "Prediction" },
  { id: "DIM-PTP-04", label: "Purpose" },
  { id: "DIM-PTP-05", label: "Pleasure" },
];

const PRIORITY_OPTIONS = ["high", "medium", "low"] as const;
const TIME_HORIZON_OPTIONS = ["immediate", "30-day", "90-day"] as const;
const INTERVENTION_TYPE_OPTIONS = ["training", "process", "leadership", "communication"] as const;
const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
  { value: "cancelled", label: "Cancelled" },
] as const;

interface OrgAdmin {
  id: string;
  full_name: string | null;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgAdmins: OrgAdmin[];
}

export default function CreateManualInterventionModal({ open, onClose, onCreated, orgAdmins }: Props) {
  const [sourceInstrument, setSourceInstrument] = useState("INST-002");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState("medium");
  const [timeHorizon, setTimeHorizon] = useState("90-day");
  const [interventionType, setInterventionType] = useState("process");
  const [status, setStatus] = useState("not_started");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setSourceInstrument("INST-002");
    setTitle("");
    setDescription("");
    setSelectedDimensions(new Set());
    setPriority("medium");
    setTimeHorizon("90-day");
    setInterventionType("process");
    setStatus("not_started");
    setTrackingNotes("");
    setOwnerUserId("");
    setTargetDate("");
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (title.trim() === "") {
      toast.error("Title is required");
      return;
    }
    if (description.trim() === "") {
      toast.error("Description is required");
      return;
    }
    setSaving(true);

    const targetDimensions = Array.from(selectedDimensions);

    const params: Record<string, unknown> = {
      p_manual_source_instrument_id: sourceInstrument,
      p_title: title.trim(),
      p_description: description.trim(),
      p_target_dimensions: targetDimensions,
      p_priority: priority,
      p_time_horizon: timeHorizon,
      p_intervention_type: interventionType,
      p_status: status,
      p_tracking_notes: trackingNotes.trim() === "" ? null : trackingNotes.trim(),
      p_assigned_owner_user_id: ownerUserId === "" ? null : ownerUserId,
      p_target_completion_date: targetDate === "" ? null : targetDate,
    };

    const { error } = await (supabase as any).rpc("create_manual_org_intervention", params);

    if (error) {
      toast.error("Failed to create: " + (error.message ?? "unknown"));
      setSaving(false);
      return;
    }

    toast.success("Custom intervention created");
    setSaving(false);
    reset();
    onCreated();
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: NAVY,
    display: "block",
    marginBottom: 4,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12,
    padding: "6px 9px",
    border: "0.5px solid var(--border)",
    borderRadius: 7,
    background: "var(--card)",
    color: "var(--foreground)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div
      onClick={handleClose}
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
          padding: 22,
          width: 560,
          maxWidth: "95vw",
          maxHeight: "92vh",
          overflowY: "auto",
          border: "0.5px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: NAVY, margin: 0 }}>Create custom intervention</h2>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0", maxWidth: 440 }}>
              Manually-created interventions must be tied to a dashboard source for filtering and reporting.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              lineHeight: 1,
              color: NAVY,
              cursor: saving ? "default" : "pointer",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Source dropdown */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Source dashboard *</label>
          <select
            value={sourceInstrument}
            onChange={(e) => setSourceInstrument(e.target.value)}
            style={inputStyle}
            disabled={saving}
          >
            {INSTRUMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short name for this intervention"
            style={inputStyle}
            disabled={saving}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this intervention, who runs it, what does success look like?"
            style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.5 }}
            disabled={saving}
          />
        </div>

        {/* Target dimensions */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Target dimensions (optional)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ border: "0.5px solid var(--border)", borderRadius: 7, padding: "8px 10px", background: "var(--card)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                NAI dimensions
              </div>
              {NAI_DIMENSIONS.map((d) => (
                <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: NAVY, padding: "3px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedDimensions.has(d.id)}
                    disabled={saving}
                    onChange={(e) => {
                      setSelectedDimensions((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(d.id);
                        else next.delete(d.id);
                        return next;
                      });
                    }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <div style={{ border: "0.5px solid var(--border)", borderRadius: 7, padding: "8px 10px", background: "var(--card)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                PTP dimensions
              </div>
              {PTP_DIMENSIONS.map((d) => (
                <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: NAVY, padding: "3px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedDimensions.has(d.id)}
                    disabled={saving}
                    onChange={(e) => {
                      setSelectedDimensions((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(d.id);
                        else next.delete(d.id);
                        return next;
                      });
                    }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}>
            Optional. Check any combination of dimensions that this intervention targets.
          </div>
        </div>

        {/* Priority / Time horizon / Type — three across */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle} disabled={saving}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Time horizon</label>
            <select value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} style={inputStyle} disabled={saving}>
              {TIME_HORIZON_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={interventionType} onChange={(e) => setInterventionType(e.target.value)} style={inputStyle} disabled={saving}>
              {INTERVENTION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Initial status / Owner / Target date — three across */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Initial status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle} disabled={saving}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Owner (optional)</label>
            <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} style={inputStyle} disabled={saving}>
              <option value="">Unassigned</option>
              {orgAdmins.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={inputStyle}
              disabled={saving}
            />
          </div>
        </div>

        {/* Tracking notes */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Tracking notes (optional)</label>
          <textarea
            value={trackingNotes}
            onChange={(e) => setTrackingNotes(e.target.value)}
            placeholder="Initial context, blockers, or next steps..."
            style={{ ...inputStyle, minHeight: 60, resize: "vertical", lineHeight: 1.5 }}
            disabled={saving}
          />
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            style={{ background: NAVY, color: "#fff" }}
          >
            {saving ? "Creating..." : "Create intervention"}
          </Button>
        </div>
      </div>
    </div>
  );
}
