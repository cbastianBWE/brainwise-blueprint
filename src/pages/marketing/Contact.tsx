import { CSSProperties, useEffect, useState } from "react";
import "@/styles/marketing-tokens.css";
import { supabase } from "@/integrations/supabase/client";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";

const inquiryOptions = [
  { value: "general", label: "General" },
  { value: "sales", label: "Sales" },
  { value: "coach_certification", label: "Coach Certification" },
  { value: "corporate", label: "Corporate / Enterprise" },
  { value: "press", label: "Press" },
  { value: "other", label: "Other" },
];

const labelStyle: CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: 13,
  color: "var(--bw-navy)",
  marginBottom: 8,
  display: "block",
};

const optionalStyle: CSSProperties = {
  fontWeight: 400,
  color: "var(--bw-slate)",
  marginLeft: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--border-1)",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 15,
  outline: "none",
  background: "white",
  color: "var(--bw-navy)",
};

const fieldWrap: CSSProperties = { marginBottom: 20 };

const initialForm = {
  name: "",
  email: "",
  organization: "",
  inquiry_type: "general",
  message: "",
  _bw_contact_url: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const isMobile = w < 640;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("submit-contact-request", {
        body: {
          name: form.name,
          email: form.email,
          organization: form.organization || undefined,
          message: form.message,
          inquiry_type: form.inquiry_type,
          _bw_contact_url: form._bw_contact_url,
          source: "contact_page",
        },
      });
      if (error) throw new Error(error.message || "Network error");
      if ((data as any)?.error) throw new Error((data as any).error);
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        err?.message || "Something went wrong. Please email support@brainwiseenterprises.com directly.",
      );
    }
  }

  return (
    <div className="bw-marketing-root">
      <MarketingNav />

      {/* Hero */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "56px 24px 32px" : "80px 48px 40px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Eyebrow>Contact</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 5vw, 48px)",
              color: "var(--bw-navy)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Get in touch.
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 17,
              color: "var(--bw-slate)",
              lineHeight: 1.55,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Tell us what you're working on and we'll get back to you within one business day. For
            30-minute briefings, use the Book a Briefing button — that path is faster.
          </p>
        </div>
      </section>

      {/* Form */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "16px 24px 64px" : "16px 48px 96px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              background: "white",
              borderRadius: "var(--r-lg)",
              padding: isMobile ? 28 : 40,
              boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--border-1)",
              position: "relative",
            }}
          >
            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  aria-hidden
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#E9F2EC",
                    color: "var(--bw-forest)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 700,
                    margin: "0 auto 20px",
                  }}
                >
                  ✓
                </div>
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: 26,
                    color: "var(--bw-navy)",
                    margin: 0,
                  }}
                >
                  Message received.
                </h2>
                <p
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 400,
                    fontSize: 15,
                    color: "var(--bw-slate)",
                    lineHeight: 1.55,
                    marginTop: 12,
                    marginBottom: 24,
                  }}
                >
                  We'll be in touch within one business day at {form.email}.
                </p>
                <MarketingButton
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setStatus("idle");
                    setForm(initialForm);
                    setErrorMsg("");
                  }}
                >
                  Send another message
                </MarketingButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Honeypot */}
                <input
                  type="text"
                  name="_bw_contact_url"
                  tabIndex={-1}
                  autoComplete="new-password"
                  aria-hidden="true"
                  value={form._bw_contact_url}
                  onChange={(e) => setForm((f) => ({ ...f, _bw_contact_url: e.target.value }))}
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    top: "auto",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                  }}
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore
                />

                <div style={fieldWrap}>
                  <label htmlFor="contact-name" style={labelStyle}>
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    maxLength={200}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div style={fieldWrap}>
                  <label htmlFor="contact-email" style={labelStyle}>
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div style={fieldWrap}>
                  <label htmlFor="contact-org" style={labelStyle}>
                    Organization
                    <span style={optionalStyle}>(optional)</span>
                  </label>
                  <input
                    id="contact-org"
                    type="text"
                    maxLength={200}
                    value={form.organization}
                    onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div style={fieldWrap}>
                  <label htmlFor="contact-inquiry" style={labelStyle}>
                    Inquiry type
                  </label>
                  <select
                    id="contact-inquiry"
                    required
                    value={form.inquiry_type}
                    onChange={(e) => setForm((f) => ({ ...f, inquiry_type: e.target.value }))}
                    style={inputStyle}
                  >
                    {inquiryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={fieldWrap}>
                  <label htmlFor="contact-message" style={labelStyle}>
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    maxLength={4000}
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "'Montserrat', sans-serif" }}
                  />
                </div>

                <MarketingButton
                  variant="primary"
                  size="lg"
                  type="submit"
                  hideArrow
                  fullWidth
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </MarketingButton>

                {status === "error" && (
                  <div
                    style={{
                      marginTop: 12,
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 400,
                      fontSize: 13,
                      color: "var(--bw-orange-700)",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
