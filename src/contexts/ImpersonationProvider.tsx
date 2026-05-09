import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ImpersonationSession {
  sessionId: string;
  actorUserId: string;
  targetUserId: string;
  targetEmail: string | null;
  mode: "observe" | "act";
  expiresAt: Date;
  startedAt: Date;
}

interface ImpersonationContextValue {
  isImpersonating: boolean;
  session: ImpersonationSession | null;
  beginImpersonation: (
    targetUserId: string,
    mode: "observe" | "act",
    justification: string
  ) => Promise<void>;
  endImpersonation: (reason: "manual" | "forced") => Promise<void>;
  remainingSeconds: number;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function sessionFromAccessToken(accessToken: string | undefined | null): ImpersonationSession | null {
  if (!accessToken) return null;
  const claims = decodeJwtPayload(accessToken);
  if (!claims) return null;
  const sessionId = claims.imp_session_id as string | undefined;
  const actorUserId = claims.imp_actor_user_id as string | undefined;
  const mode = claims.imp_mode as "observe" | "act" | undefined;
  const expiresAtRaw = claims.imp_expires_at as number | undefined;
  const sub = claims.sub as string | undefined;
  if (!sessionId || !actorUserId || !mode || !expiresAtRaw || !sub) return null;
  const expiresAt = new Date(expiresAtRaw * 1000);
  if (expiresAt.getTime() <= Date.now()) return null;
  const stashedEmail = (() => {
    try {
      return localStorage.getItem(`bw_imp_target_email_${sessionId}`);
    } catch {
      return null;
    }
  })();
  return {
    sessionId,
    actorUserId,
    targetUserId: sub,
    targetEmail: stashedEmail,
    mode,
    expiresAt,
    startedAt: new Date(expiresAt.getTime() - 30 * 60 * 1000),
  };
}

const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(sessionFromAccessToken(data.session?.access_token));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(sessionFromAccessToken(s?.access_token));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isImpersonating = !!session;

  const endImpersonation = useCallback(async (_reason: "manual" | "forced") => {
    const { data, error } = await supabase.functions.invoke("impersonation-end", { body: {} });
    if (error) {
      await supabase.auth.signOut();
      navigate("/login");
      return;
    }
    if (data?.restored && data?.access_token && data?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      await queryClient.invalidateQueries();
      navigate("/super-admin/users");
    } else {
      await supabase.auth.signOut();
      navigate("/login");
    }
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!isImpersonating || !session) {
      setRemainingSeconds(0);
      return;
    }
    const tick = () => {
      const r = Math.max(0, Math.round((session.expiresAt.getTime() - Date.now()) / 1000));
      setRemainingSeconds(r);
      if (r === 0) {
        endImpersonation("forced");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isImpersonating, session, endImpersonation]);

  const beginImpersonation = useCallback(
    async (targetUserId: string, mode: "observe" | "act", justification: string) => {
      const { data, error } = await supabase.functions.invoke("impersonation-start", {
        body: { target_user_id: targetUserId, mode, justification },
      });
      if (error) throw error;
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("impersonation-start did not return tokens");
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      await queryClient.invalidateQueries();
      navigate("/dashboard");
    },
    [navigate, queryClient]
  );

  return (
    <ImpersonationContext.Provider
      value={{ isImpersonating, session, beginImpersonation, endImpersonation, remainingSeconds }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = (): ImpersonationContextValue => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
};

export default ImpersonationProvider;
