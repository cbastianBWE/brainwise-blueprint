import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import MarketingButton from "./MarketingButton";

const navLinks = [
  { label: "Products", to: "/coming-soon" },
  { label: "Pricing", to: "/coming-soon" },
  { label: "Services", to: "/coming-soon" },
  { label: "Contact", to: "/coming-soon" },
];

export default function MarketingNav() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--bw-navy)",
        padding: isMobile ? "14px 20px" : "18px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/brain-icon.png" alt="" style={{ height: 36, width: 36 }} />
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: isMobile ? 15 : 18,
            color: "#fff",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          BrainWise Enterprises
        </span>
      </Link>

      {!isMobile && (
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="bw-nav-link"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: "rgba(255,255,255,0.82)",
                transition: "color var(--dur-fast)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <MarketingButton as={Link} to="/login" variant="ghost" size={isMobile ? "sm" : "md"} hideArrow>
          Sign In
        </MarketingButton>
        <MarketingButton as={Link} to="/signup" variant="primary" size={isMobile ? "sm" : "md"}>
          Sign Up
        </MarketingButton>
      </div>
    </nav>
  );
}
