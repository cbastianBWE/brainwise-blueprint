import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationProvider";

const formatCountdown = (s: number): string => {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const ImpersonationBanner = () => {
  const { isImpersonating, session, remainingSeconds, endImpersonation } = useImpersonation();

  useEffect(() => {
    if (!isImpersonating) return;
    document.body.style.paddingTop = "48px";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [isImpersonating]);

  if (!isImpersonating || !session) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 48,
        background: "var(--bw-orange)",
        color: "#FFFFFF",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          background: "var(--bw-orange-700)",
          color: "#FFFFFF",
          borderRadius: 9999,
          padding: "4px 10px",
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {session.mode}
      </span>
      <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
        Impersonating:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 400 }}>
          {session.targetUserId}
        </span>
      </span>
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
        Time remaining:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 400 }}>
          {formatCountdown(remainingSeconds)}
        </span>
      </span>
      <Button
        variant="ghost"
        className="hover:bg-white/10"
        style={{
          border: "1px solid #FFFFFF",
          color: "#FFFFFF",
          background: "transparent",
        }}
        onClick={() => endImpersonation("manual")}
      >
        Exit Impersonation
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
