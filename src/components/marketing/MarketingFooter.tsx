import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const linkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  textDecoration: "none",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  display: "block",
  padding: "4px 0",
  transition: "color 140ms",
};

const columnHeading: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: 12,
  color: "var(--bw-orange)",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  marginBottom: 14,
};

export default function MarketingFooter() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  return (
    <footer style={{ background: "var(--bw-navy)", padding: "56px 48px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Top: wordmark + tagline */}
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

        {/* Middle: legal links + contact */}
        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 32 : 48,
          }}
        >
          <div>
            <div style={columnHeading}>Legal</div>
            <Link to="/privacy" className="bw-footer-link" style={linkStyle}>Privacy Policy</Link>
            <Link to="/terms" className="bw-footer-link" style={linkStyle}>Terms of Service</Link>
            <Link to="/cookies" className="bw-footer-link" style={linkStyle}>Cookies</Link>
            <Link to="/international-privacy" className="bw-footer-link" style={linkStyle}>International Privacy</Link>
          </div>
          <div>
            <div style={columnHeading}>Contact</div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              support@brainwiseenterprises.com
            </div>
          </div>
        </div>

        {/* Bottom: copyright */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          © 2026 BrainWise Enterprises.
        </div>
      </div>
    </footer>
  );
}
