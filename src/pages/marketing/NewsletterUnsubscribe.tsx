import { CSSProperties, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import SubscribeForm from "@/components/marketing/newsletter/SubscribeForm";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";

const cardStyle: CSSProperties = {
  background: "var(--bw-cream, #FBF7F1)",
  borderRadius: 16,
  padding: "48px 36px",
  maxWidth: 520,
  margin: "0 auto",
  textAlign: "center",
};

export default function NewsletterUnsubscribe() {
  const { token = "" } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return setPageMeta({
      title: "Unsubscribe — BrainWise Newsletter",
      description: "Unsubscribe from the BrainWise newsletter.",
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      const { error } = await supabase.rpc("unsubscribe_from_newsletter", {
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
            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(0,0,0,0.6)" }}>
              Unsubscribing…
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
                You've been unsubscribed.
              </h1>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: "rgba(0,0,0,0.65)",
                  margin: "0 0 32px",
                  fontSize: 14,
                }}
              >
                Sorry to see you go. You won't receive any more emails from the BrainWise newsletter.
              </p>
              <div style={{ textAlign: "left" }}>
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 16,
                    color: "var(--bw-navy)",
                    margin: "0 0 12px",
                    textAlign: "center",
                  }}
                >
                  Changed your mind?
                </h2>
                <SubscribeForm source="resubscribe_from_unsubscribe" variant="inline" />
              </div>
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
                  margin: 0,
                  fontSize: 14,
                }}
              >
                {message ?? "The unsubscribe link couldn't be processed."}
              </p>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
