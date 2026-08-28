// Central client error capture.
//
// Every function here is fire-and-forget and must never throw, never await on
// a user-visible path, and never log noise to the console.

import { supabase as rawSupabase } from "@/integrations/supabase/rawClient";

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** True while a capture is in flight, so a capture failure can never recurse. */
let capturing = false;

export const CAPTURE_RPC = "log_client_error";

export function normaliseRoute(pathname?: string): string {
  const path = (pathname ?? (typeof location !== "undefined" ? location.pathname : "/")) || "/";
  return (
    "/" +
    path
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ":id";
        if (/^\d+$/.test(seg)) return ":n";
        return seg;
      })
      .join("/")
  );
}

export function normaliseMessage(message?: string): string {
  return (message ?? "")
    .replace(UUID_RE, ":id")
    .replace(/\d{3,}/g, ":n")
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Simple non-crypto stable string hash, base36. */
export function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

export interface CaptureInput {
  source: "rpc" | "invoke" | "render" | "unhandled_rejection" | "window_error";
  operation?: string | null;
  errorCode?: string | null;
  message?: string | null;
  status?: number | null;
  details?: string | null;
  hint?: string | null;
  route?: string | null;
}

function buildRaw(input: CaptureInput): Record<string, unknown> {
  const raw: Record<string, unknown> = { source: input.source };
  if (input.status != null) raw.status = input.status;
  if (input.errorCode) raw.code = input.errorCode;
  if (input.operation) raw.operation = input.operation;
  if (input.details) raw.details = String(input.details).slice(0, 500);
  if (input.hint) raw.hint = String(input.hint).slice(0, 300);
  const json = JSON.stringify(raw);
  if (json.length > 2000) return { source: input.source, code: input.errorCode ?? null };
  return raw;
}

const APP_VERSION =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.MODE) || "unknown";

/** Fire-and-forget. Never awaited by anything a user waits on. */
export function captureClientError(input: CaptureInput): void {
  if (capturing) return;
  if (input.operation === CAPTURE_RPC) return;
  // The flag is synchronous only: it blocks a capture raised from inside a
  // capture, never a second capture for a different, concurrent failure.
  capturing = true;
  try {
    const route = normaliseRoute(input.route ?? undefined);
    const normalisedMessage = normaliseMessage(input.message ?? undefined);
    const fingerprint = hashString(
      route + "|" + (input.operation ?? "") + "|" + (input.errorCode ?? "") + "|" + normalisedMessage,
    );

    const promise = rawSupabase.rpc(CAPTURE_RPC, {
      p_fingerprint: fingerprint,
      p_source: input.source,
      p_operation: input.operation ?? undefined,
      p_route: route,
      p_error_code: input.errorCode ?? undefined,
      p_message: (input.message ?? "").slice(0, 500) || undefined,
      p_raw: buildRaw(input) as never,
      p_user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
      p_app_version: APP_VERSION,
    });
    // Discard both a resolved { error } and any rejection, in silence.
    void Promise.resolve(promise).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    /* capture must never throw */
  } finally {
    capturing = false;
  }
}

/** Pull a message/code out of an arbitrary thrown or resolved error value. */
export function describeError(err: unknown): {
  message: string;
  errorCode?: string | null;
  status?: number | null;
  details?: string | null;
  hint?: string | null;
} {
  const e = err as any;
  if (!e) return { message: "unknown error" };
  if (typeof e === "string") return { message: e };
  return {
    message: String(e.message ?? e.error_description ?? e.name ?? "unknown error"),
    errorCode: e.code ?? e.status_code ?? null,
    status: e.status ?? e.context?.status ?? null,
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}
