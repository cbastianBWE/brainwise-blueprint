import { Link } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";

export default function ComingSoon() {
  return (
    <div
      className="bw-marketing-root"
      style={{
        background: "var(--bw-cream)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 600, textAlign: "center" }}>
        <Eyebrow>Coming Soon</Eyebrow>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: 48,
            color: "var(--bw-navy)",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          We're building this.
        </h1>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 16,
            color: "var(--bw-slate)",
            lineHeight: 1.55,
            marginBottom: 32,
          }}
        >
          This page is part of our Phase 6 build. Check back soon.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <MarketingButton as={Link} to="/signup" variant="primary" size="md">
            Sign Up
          </MarketingButton>
          <MarketingButton
            as={Link}
            to="/"
            variant="ghost"
            size="md"
            hideArrow
            style={{ color: "var(--bw-navy)", borderColor: "var(--border-2)" }}
          >
            ← Back to home
          </MarketingButton>
        </div>
      </div>
    </div>
  );
}
