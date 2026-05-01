import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import MarketingButton from "./MarketingButton";
import Eyebrow from "./Eyebrow";

interface Props {
  open: boolean;
  onClose: () => void;
  source?: string;
}

const labelStyle: CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--bw-slate)",
  marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--border-1)",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 14,
  outline: "none",
  background: "var(--bw-cream-100)",
  color: "var(--bw-navy)",
};

export default function BriefingModal({ open, onClose, source }: Props) {
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", message: "", website: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMsg("");
      setForm({ name: "", email: "", company: "", role: "", message: "", website: "" });
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("submit-briefing-request", {
        body: {
          name: form.name,
          email: form.email,
          company: form.company,
          role: form.role,
          message: form.message || undefined,
          website: form.website,
          source: source ?? "homepage_briefing_modal",
        },
      });
      if (error) throw new Error(error.message || "Network error");
      if ((data as any)?.error) throw new Error((data as any).error);
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong. Please email support@brainwiseenterprises.com directly.");
    }
  }

  const node = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,15,28,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "min(560px, 92vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: 22,
          padding: 40,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          color: "var(--bw-navy)",
        }}
      >
        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "#E9F2EC",
                color: "var(--bw-forest)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              ✓
            </div>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 28, color: "var(--bw-navy)", margin: 0 }}>
              Request received.
            </h2>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14.5, color: "var(--bw-slate)", marginTop: 8, lineHeight: 1.55 }}>
              We'll be in touch within one business day at {form.email}.
            </p>
            <div style={{ marginTop: 24 }}>
              <MarketingButton
                variant="ghost"
                onClick={onClose}
                hideArrow
                style={{ color: "var(--bw-navy)", borderColor: "var(--border-2)" }}
              >
                Close
              </MarketingButton>
            </div>
          </div>
        ) : (
          <>
            <Eyebrow>30-Minute Briefing</Eyebrow>
            <h2
              id="briefing-title"
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 30,
                color: "var(--bw-navy)",
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              Tell us about your team.
            </h2>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, color: "var(--bw-slate)", marginTop: 4, marginBottom: 24 }}>
              We'll be in touch within one business day.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
              />

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Name</div>
                <input
                  ref={firstInputRef}
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Work Email</div>
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Company</div>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Role</div>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>What can we help with?</div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "'Montserrat', sans-serif" }}
                />
              </label>

              <MarketingButton type="submit" variant="primary" size="lg" fullWidth disabled={status === "submitting"} hideArrow>
                {status === "submitting" ? "Sending…" : "Request Briefing"}
              </MarketingButton>

              {status === "error" && (
                <p style={{ color: "var(--bw-orange-700)", fontFamily: "'Montserrat', sans-serif", fontSize: 13, marginTop: 4 }}>
                  {errorMsg}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
