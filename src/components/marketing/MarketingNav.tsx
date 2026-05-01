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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

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
        <img src="/brain-icon.png" alt="BrainWise Enterprises" style={{ height: 36, width: 36 }} />
        {!isMobile && (
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            BrainWise Enterprises
          </span>
        )}
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

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            style={{
              background: "transparent",
              border: "none",
              padding: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}
        <MarketingButton as={Link} to="/login" variant="ghost" size={isMobile ? "sm" : "md"} hideArrow>
          Sign In
        </MarketingButton>
        <MarketingButton as={Link} to="/signup" variant="primary" size={isMobile ? "sm" : "md"}>
          Sign Up
        </MarketingButton>
      </div>

      {mobileMenuOpen && isMobile && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              top: "var(--bw-nav-height, 64px)",
              background: "rgba(0,0,0,0.3)",
              zIndex: 28,
            }}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--bw-navy)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              padding: "16px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              zIndex: 29,
            }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                role="menuitem"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "rgba(255,255,255,0.92)",
                  textDecoration: "none",
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "14px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
