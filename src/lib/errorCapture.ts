// Central client error capture.
//
// Every function here is fire-and-forget and must never throw, never await on
// a user-visible path, and never log noise to the console.

import { supabase as rawSupabase } from "@/integrations/supabase/rawClient";

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * True only for the synchronous body of a capture, so a failure raised from
 * inside captureClientError cannot recurse. It is NOT in flight for the RPC's
 * duration and is not a throttle — see the dedupe map below for that.
 */
let capturing = false;

/** Fingerprint -> last send time (ms). Bounded, oldest evicted. */
const recentSends = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;
const MAX_TRACKED_FINGERPRINTS = 200;
const MAX_CAPTURES_PER_PAGE = 50;
let capturesThisPage = 0;

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
    .replace(EMAIL_RE, ":email")
    .replace(UUID_RE, ":id")
    .replace(/\d{3,}/g, ":n")
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}


const UUID_EXACT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An operation is a stable identifier, never data. Keep the leading segments
 * that are recognisably names of things and drop the first unsafe segment and
 * everything after it, so parameters (ids, names) can never be stored.
 */
export function normaliseOperation(operation: unknown): string | undefined {
  const segments =
    Array.isArray(operation)
      ? operation.map((s) => String(s))
      : typeof operation === "string"
        ? operation.split(":")
        : [];

  const safe: string[] = [];
  for (const seg of segments) {
    if (!/^[a-z][a-z0-9_-]*$/.test(seg)) break;
    if (seg.length > 32) break;
    if (UUID_EXACT_RE.test(seg)) break;
    if (/\d{3,}/.test(seg)) break;
    safe.push(seg);
  }
  if (safe.length === 0) return undefined;
  return safe.join(":").slice(0, 80);
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
  source:
    | "rpc"
    | "invoke"
    | "render"
    | "unhandled_rejection"
    | "window_error"
    | "query"
    | "mutation";
  operation?: string | null;
  errorCode?: string | null;
  message?: string | null;
  status?: number | null;
  details?: string | null;
  hint?: string | null;
  route?: string | null;
}

/**
 * The server only accepts a fixed set of source values and coerces anything
 * else to window_error, so map the finer-grained client sources onto one it
 * understands. The precise source is kept verbatim in raw.source.
 */
function wireSource(source: CaptureInput["source"]): string {
  if (source === "query" || source === "mutation") return "rpc";
  return source;
}

function buildRaw(input: CaptureInput, operation: string | undefined): Record<string, unknown> {
  const raw: Record<string, unknown> = { source: input.source };
  if (input.status != null) raw.status = input.status;
  if (input.errorCode) raw.code = input.errorCode;
  if (operation) raw.operation = operation;
  // details/hint routinely carry user data (e.g. `Key (email)=(a@b.com) ...`),
  // so they are normalised exactly like the message before being stored.
  if (input.details) raw.details = normaliseMessage(String(input.details)).slice(0, 500);
  if (input.hint) raw.hint = normaliseMessage(String(input.hint)).slice(0, 300);
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
  if (capturesThisPage >= MAX_CAPTURES_PER_PAGE) return;
  // The flag is synchronous only: it blocks a capture raised from inside a
  // capture, never a second capture for a different, concurrent failure.
  capturing = true;
  try {
    const route = normaliseRoute(input.route ?? undefined);
    const operation = normaliseOperation(input.operation ?? undefined);
    const normalisedMessage = normaliseMessage(input.message ?? undefined);
    const fingerprint = hashString(
      route + "|" + (operation ?? "") + "|" + (input.errorCode ?? "") + "|" + normalisedMessage,
    );

    // Client-side dedupe, mirroring the server guard so the RPC is never issued.
    const now = Date.now();
    const last = recentSends.get(fingerprint);
    if (last != null && now - last < DEDUPE_WINDOW_MS) return;
    recentSends.set(fingerprint, now);
    if (recentSends.size > MAX_TRACKED_FINGERPRINTS) {
      const oldest = recentSends.keys().next();
      if (!oldest.done) recentSends.delete(oldest.value);
    }
    capturesThisPage += 1;

    const promise = rawSupabase.rpc(CAPTURE_RPC, {
      p_fingerprint: fingerprint,
      p_source: wireSource(input.source),
      p_operation: operation,
      p_route: route,
      p_error_code: input.errorCode ?? undefined,
      p_message: normalisedMessage || undefined,
      p_raw: buildRaw(input, operation) as never,

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
