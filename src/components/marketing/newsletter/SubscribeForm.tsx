import { CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TURNSTILE_SITE_KEY = "0x4AAAAAADVBROvQ5jLUUIxJ";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileLoader: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (turnstileLoader) return turnstileLoader;
  turnstileLoader = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`,
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const start = Date.now();
    const tick = () => {
      if (window.turnstile) return resolve();
      if (Date.now() - start > 10_000) return reject(new Error("Turnstile load timeout"));
      setTimeout(tick, 80);
    };
    script.addEventListener("load", tick);
    tick();
  });
  return turnstileLoader;
}

export interface SubscribeFormProps {
  source: string;
  variant?: "inline" | "banner" | "footer";
  onSubscribed?: () => void;
}

export default function SubscribeForm({
  source,
  variant = "inline",
  onSubscribed,
}: SubscribeFormProps) {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (confirmed) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || renderedRef.current || !widgetRef.current || !window.turnstile) return;
        renderedRef.current = true;
        try {
          const id = window.turnstile.render(widgetRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (t) => setToken(t),
            "expired-callback": () => setToken(null),
            "error-callback": () => setToken(null),
            theme: variant === "footer" ? "dark" : "light",
            size: "flexible",
          });
          widgetIdRef.current = id;
        } catch {
          // Already rendered
        }
      })
      .catch(() => {
        // Silent — submit button shows captcha-required state
      });
    return () => {
      cancelled = true;
    };
  }, [variant, confirmed]);

  const resetCaptcha = () => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* noop */
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!token) {
      toast.error("Please complete the captcha.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("subscribe_to_newsletter", {
      p_email: trimmed,
      p_turnstile_token: token,
      p_source: source,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Subscription failed. Please try again.");
      resetCaptcha();
      return;
    }
    setConfirmed(true);
    onSubscribed?.();
  };

  // ---- Visual variants ----
  const isFooter = variant === "footer";
  const isBanner = variant === "banner";

  const wrapperStyle: CSSProperties =
    variant === "inline"
      ? {
          background: "var(--bw-cream, #FBF7F1)",
          borderRadius: 16,
          padding: "28px 28px",
          border: "1px solid rgba(0,0,0,0.06)",
        }
      : isBanner
        ? {
            background: "linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-plum, #3C096C) 100%)",
            borderRadius: 20,
            padding: "40px 32px",
            color: "#fff",
          }
        : {
            // footer
            background: "transparent",
            padding: 0,
            color: "#fff",
          };

  const inputStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: 44,
    padding: "0 14px",
    borderRadius: 8,
    border: isFooter
      ? "1px solid rgba(255,255,255,0.2)"
      : "1px solid rgba(0,0,0,0.12)",
    background: isFooter ? "rgba(255,255,255,0.08)" : "#fff",
    color: isFooter ? "#fff" : "var(--bw-navy)",
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 14,
    outline: "none",
  };

  const buttonStyle: CSSProperties = {
    height: 44,
    padding: "0 22px",
    borderRadius: 8,
    border: "none",
    background: "var(--bw-orange)",
    color: "#fff",
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: submitting ? "wait" : "pointer",
    opacity: submitting ? 0.7 : 1,
    transition: "background 140ms, opacity 140ms",
    whiteSpace: "nowrap",
  };

  if (confirmed) {
    return (
      <div style={{ ...wrapperStyle, textAlign: "left" }}>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: isFooter || isBanner ? "#fff" : "var(--bw-navy)",
            marginBottom: 6,
          }}
        >
          Check your inbox to confirm.
        </div>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            color: isFooter || isBanner ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)",
          }}
        >
          We just sent a confirmation link to {email.trim()}.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={wrapperStyle}>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <div
        ref={widgetRef}
        style={{
          marginTop: 14,
          minHeight: 65,
          display: "flex",
          justifyContent: isBanner ? "flex-start" : "flex-start",
        }}
      />
      <p
        style={{
          marginTop: 12,
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 11,
          color: isFooter || isBanner ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
          lineHeight: 1.5,
        }}
      >
        Double opt-in. Unsubscribe anytime. We never share your email.
      </p>
    </form>
  );
}
