import { CSSProperties, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";

const cardStyle: CSSProperties = {
  background: "var(--bw-cream, #FBF7F1)",
  borderRadius: 16,
  padding: "48px 36px",
  maxWidth: 480,
  margin: "0 auto",
  textAlign: "center",
};

export default function NewsletterConfirm() {
  const { token = "" } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return setPageMeta({
      title: "Confirm subscription — BrainWise Newsletter",
      description: "Confirm your subscription to the BrainWise newsletter.",
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      const { error } = await supabase.rpc("confirm_newsletter_subscription", {
        p_token: token,
      });
      if (cancelled) return;
      if (error) {
        setMessage(error.message);
        setState("error");
      } else {
        setState("success");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <MarketingNav />
      <div style={{ padding: "96px 20px" }}>
        <div style={cardStyle}>
          {state === "loading" && (
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                color: "rgba(0,0,0,0.6)",
              }}
            >
              Confirming your subscription…
            </p>
          )}
          {state === "success" && (
            <>
              <h1
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: 28,
                  color: "var(--bw-navy)",
                  margin: "0 0 12px",
                }}
              >
                You're confirmed!
              </h1>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: "rgba(0,0,0,0.65)",
                  margin: "0 0 24px",
                }}
              >
                You'll get the next BrainWise newsletter in your inbox.
              </p>
              <Link
                to="/newsletter"
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
                Browse the newsletter
              </Link>
            </>
          )}
          {state === "error" && (
            <>
              <h1
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: 24,
                  color: "var(--bw-navy)",
                  margin: "0 0 12px",
                }}
              >
                This link is invalid or expired
              </h1>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: "rgba(0,0,0,0.65)",
                  margin: "0 0 24px",
                  fontSize: 14,
                }}
              >
                {message ?? "The confirmation link couldn't be processed."} You can try subscribing again from the newsletter page.
              </p>
              <Link
                to="/newsletter"
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
                Go to newsletter
              </Link>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
