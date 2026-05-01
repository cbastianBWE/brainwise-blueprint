export default function MarketingFooter() {
  return (
    <footer style={{ background: "var(--bw-navy)", padding: "56px 48px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/brain-icon.png" alt="" style={{ height: 40, width: 40 }} />
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              BrainWise Enterprises
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.22em",
              color: "var(--bw-orange)",
              textTransform: "uppercase",
            }}
          >
            Faster Change. More Wins.
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>© 2026 BrainWise Enterprises.</div>
          <div>support@brainwiseenterprises.com · Privacy Policy and Terms of Service coming soon</div>
        </div>
      </div>
    </footer>
  );
}
