import { CSSProperties, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import SubscribeForm from "./SubscribeForm";

interface PaywallCardProps {
  paywallReason: "subscriber_required" | "plan_tier_required";
  allowedPlanTiers?: string[] | null;
  slug: string;
}

export default function PaywallCard({
  paywallReason,
  allowedPlanTiers,
  slug,
}: PaywallCardProps) {
  const [showForm, setShowForm] = useState(false);
  const isPlanTier = paywallReason === "plan_tier_required";

  const card: CSSProperties = {
    background: "var(--bw-cream, #FBF7F1)",
    borderRadius: 20,
    border: "1px solid rgba(0,0,0,0.06)",
    padding: "40px 36px",
    maxWidth: 720,
    margin: "32px auto",
    textAlign: "center",
  };

  const headline = isPlanTier
    ? "This article is for plan members"
    : "This article is for subscribers";
  const subtitle = isPlanTier
    ? `Available on ${(allowedPlanTiers ?? []).join(", ") || "select"} plans.`
    : "Subscribe to the BrainWise newsletter to read this article and our full archive.";

  return (
    <div style={card}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--bw-orange)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Lock size={24} />
      </div>
      <h2
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 24,
          color: "var(--bw-navy)",
          margin: "0 0 10px",
          letterSpacing: "-0.01em",
        }}
      >
        {headline}
      </h2>
      <p
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 15,
          lineHeight: 1.6,
          color: "rgba(0,0,0,0.7)",
          margin: "0 0 24px",
          maxWidth: 520,
          marginInline: "auto",
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {isPlanTier ? (
          <Link
            to="/pricing"
            style={{
              background: "var(--bw-orange)",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 8,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            View pricing
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            style={{
              background: "var(--bw-orange)",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 8,
              border: "none",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Subscribe to read
          </button>
        )}
        <Link
          to={`/login?redirect=/newsletter/${slug}`}
          style={{
            background: "transparent",
            color: "var(--bw-navy)",
            padding: "12px 22px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Already subscribed? Sign in
        </Link>
      </div>

      {showForm && !isPlanTier && (
        <div style={{ marginTop: 28, textAlign: "left" }}>
          <SubscribeForm source="paywall_article" variant="inline" />
        </div>
      )}
    </div>
  );
}
