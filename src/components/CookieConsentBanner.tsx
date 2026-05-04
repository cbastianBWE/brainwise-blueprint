import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptAll,
  rejectAll,
  setConsent,
  hasConsent,
  getConsent,
  OPEN_SETTINGS_EVENT,
} from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (!hasConsent()) setVisible(true);
  }, []);

  useEffect(() => {
    const onOpen = () => {
      const existing = getConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setShowCustomize(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    setShowCustomize(false);
  };

  const handleAcceptAll = () => { acceptAll(); close(); };
  const handleRejectAll = () => { rejectAll(); close(); };
  const handleSaveCustom = () => { setConsent({ analytics, marketing }); close(); };

  const handleOpenCustomize = () => {
    const existing = getConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    setShowCustomize(true);
  };

  // ===== Customize modal =====
  if (showCustomize) {
    return (
      <div
        className="bw-marketing-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bw-cookie-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && hasConsent()) close();
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 31, 54, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "var(--s-4)",
        }}
      >
        <div
          style={{
            background: "var(--bw-white)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-xl)",
            maxWidth: 560,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "var(--s-8)",
          }}
        >
          <h2
            id="bw-cookie-modal-title"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--fg-1)",
              margin: 0,
              marginBottom: "var(--s-3)",
            }}
          >
            Cookie preferences
          </h2>
          <p
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: 14,
              color: "var(--fg-2)",
              lineHeight: 1.55,
              margin: 0,
              marginBottom: "var(--s-6)",
            }}
          >
            Choose which categories you allow. Necessary cookies are always on.{" "}
            <Link
              to="/cookies"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
              onClick={close}
            >
              Learn more
            </Link>
            .
          </p>

          <CategoryRow
            title="Necessary"
            description="Required for authentication, security, and core platform functions. Always active."
            checked={true}
            disabled={true}
            onChange={() => {}}
          />
          <CategoryRow
            title="Analytics"
            description="Helps us understand how the platform is used so we can improve it."
            checked={analytics}
            disabled={false}
            onChange={setAnalytics}
          />
          <CategoryRow
            title="Marketing"
            description="Used to deliver more relevant content and measure campaign effectiveness."
            checked={marketing}
            disabled={false}
            onChange={setMarketing}
          />

          <div
            style={{
              marginTop: "var(--s-8)",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "flex-end",
              gap: "var(--s-3)",
            }}
          >
            <button
              type="button"
              className={`bw-btn bw-btn-ghost bw-btn-md${isMobile ? " bw-btn-fullwidth" : ""}`}
              onClick={handleRejectAll}
            >
              Reject all
            </button>
            <button
              type="button"
              className={`bw-btn bw-btn-primary bw-btn-md${isMobile ? " bw-btn-fullwidth" : ""}`}
              onClick={handleSaveCustom}
            >
              Save preferences
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Bottom bar =====
  return (
    <div
      className="bw-marketing-root"
      role="dialog"
      aria-modal="false"
      aria-labelledby="bw-cookie-bar-title"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bw-navy)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 9998,
        padding: isMobile ? "var(--s-5) var(--s-4)" : "var(--s-5) var(--s-8)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container)",
          margin: "0 auto",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? "var(--s-4)" : "var(--s-6)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            id="bw-cookie-bar-title"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--bw-white)",
              marginBottom: "var(--s-1)",
            }}
          >
            We use cookies.
          </div>
          <p
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: 13,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            We use necessary cookies for authentication and core functions. With your consent, we may also use analytics and marketing cookies.{" "}
            <Link to="/cookies" style={{ color: "var(--bw-orange)", textDecoration: "underline" }}>
              Learn more
            </Link>
            .
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "var(--s-3)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className={`bw-btn bw-btn-invert bw-btn-md${isMobile ? " bw-btn-fullwidth" : ""}`}
            onClick={handleOpenCustomize}
          >
            Customize
          </button>
          <button
            type="button"
            className={`bw-btn bw-btn-invert bw-btn-md${isMobile ? " bw-btn-fullwidth" : ""}`}
            onClick={handleRejectAll}
          >
            Reject all
          </button>
          <button
            type="button"
            className={`bw-btn bw-btn-primary bw-btn-md${isMobile ? " bw-btn-fullwidth" : ""}`}
            onClick={handleAcceptAll}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--s-4)",
        padding: "var(--s-4)",
        background: "var(--bw-cream-200)",
        borderRadius: "var(--r-md)",
        marginBottom: "var(--s-3)",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--fg-1)",
            marginBottom: "var(--s-1)",
          }}
        >
          {title}
        </div>
        <p
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: 12,
            color: "var(--fg-3)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
      <label
        style={{
          position: "relative",
          display: "inline-block",
          width: 40,
          height: 22,
          flexShrink: 0,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
          aria-label={`${title} cookies`}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: checked ? "var(--bw-orange)" : "var(--bw-slate-300)",
            borderRadius: "var(--r-pill)",
            transition: "background var(--dur-fast) var(--ease-standard)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            background: "var(--bw-white)",
            borderRadius: "var(--r-circle)",
            transition: "left var(--dur-fast) var(--ease-standard)",
            boxShadow: "var(--shadow-xs)",
          }}
        />
      </label>
    </div>
  );
}
