// Instrumented Supabase client.
//
// Same shape and same types as the generated client, but a resolved `error`
// on .rpc() and .functions.invoke() fires a fire-and-forget capture before
// the result is returned completely unchanged.
//
// The generated file (./client.ts) is imported relatively so this module is
// never aliased back onto itself.
import { supabase as base } from "./client";
import { CAPTURE_RPC, captureClientError, describeError, markCaptured } from "@/lib/errorCapture";

type AnyFn = (...args: unknown[]) => unknown;

const rpcOriginal = base.rpc.bind(base) as AnyFn;

const instrumentedRpc = ((...args: unknown[]) => {
  const fn = String(args[0] ?? "");
  const result = rpcOriginal(...args) as any;
  if (!result || typeof result.then !== "function") return result;
  if (fn === CAPTURE_RPC) return result;

  const capture = (res: any) => {
    try {
      if (res && res.error) {
        const d = describeError(res.error);
        captureClientError({
          source: "rpc",
          operation: fn,
          errorCode: d.errorCode,
          message: d.message,
          status: res.status ?? d.status,
          details: d.details,
          hint: d.hint,
        });
        markCaptured(res.error);
      }
    } catch {
      /* capture must never affect the caller */
    }
    return res;
  };

  // Tap the builder without consuming it: every property is forwarded, so
  // .single()/.eq()/.returns() keep working and keep returning builders, and
  // the query stays lazy until the caller awaits it.
  const wrap = (builder: any): any =>
    new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === "then") {
          return (onFulfilled?: any, onRejected?: any) =>
            target.then((res: any) => {
              capture(res);
              return onFulfilled ? onFulfilled(res) : res;
            }, onRejected);
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return (...callArgs: unknown[]) => {
            const out = value.apply(target, callArgs);
            // Builder methods return the builder (or a new one) — keep tapping.
            return out && typeof out.then === "function" ? wrap(out) : out;
          };
        }
        return value;
      },
    });

  return wrap(result);
}) as typeof base.rpc;


// `base.functions` is a getter that builds a fresh FunctionsClient on every
// access, so patching what it hands back once would be thrown away. Take one
// instance, patch it, and pin it behind a plain property.
// Statuses that are part of a function's contract rather than a failure. The caller
// handles these and shows the person a plain-language message, so recording them as
// errors inflates the volume the D23 triage would be billed for.
//
// Keep this list SHORT and specific. A status is only listed here when the calling code
// demonstrably handles it. Never add a status globally: a 429 from a function that does
// not expect one is a real finding.
const EXPECTED_INVOKE_STATUSES: Record<string, number[]> = {
  "best-day-organizer": [429, 409],
};

const functionsClient = base.functions;
const invokeOriginal = functionsClient.invoke.bind(functionsClient) as AnyFn;

const instrumentedInvoke = (async (...args: unknown[]) => {
  const name = String(args[0] ?? "");
  const res = (await invokeOriginal(...args)) as any;
  try {
    if (res && res.error) {
      const d = describeError(res.error);
      const status = (res.error as any)?.status ?? (res.error as any)?.context?.status ?? d.status;
      const expected =
        typeof status === "number" && EXPECTED_INVOKE_STATUSES[name]?.includes(status);
      if (!expected) {
        const record = (message: string) =>
          captureClientError({
            source: "invoke",
            operation: name,
            errorCode: d.errorCode,
            message,
            status: d.status,
            details: d.details,
            hint: d.hint,
          });

        // The real message from the function lives on error.context (a Response).
        // Read a clone so the caller can still consume the body. Never await:
        // the caller must not be delayed by the capture.
        let started = false;
        try {
          const ctx = (res.error as any)?.context;
          if (ctx && typeof ctx.clone === "function") {
            const clone = ctx.clone();
            if (clone && typeof clone.text === "function") {
              started = true;
              Promise.resolve(clone.text())
                .then((raw: string) => {
                  let message = d.message;
                  const text = typeof raw === "string" ? raw.slice(0, 2000) : "";
                  if (text) {
                    let picked = "";
                    try {
                      const parsed = JSON.parse(text);
                      if (parsed && typeof parsed === "object") {
                        for (const key of ["error", "message", "detail"]) {
                          const v = (parsed as any)[key];
                          if (typeof v === "string" && v.trim()) {
                            picked = v;
                            break;
                          }
                        }
                      }
                    } catch {
                      picked = text.trim();
                    }
                    if (picked) message = picked;
                  }
                  record(message);
                })
                .catch(() => {
                  try {
                    record(d.message);
                  } catch {
                    /* capture must never affect the caller */
                  }
                });
            }
          }
        } catch {
          started = false;
        }
        if (!started) record(d.message);
      }

      markCaptured(res.error);
    }
  } catch {
    /* capture must never affect the caller */
  }
  return res;
}) as typeof functionsClient.invoke;

(functionsClient as any).invoke = instrumentedInvoke;

// Patch in place: the client object identity stays the same, so auth state,
// realtime channels and every other surface behave exactly as before.
(base as any).rpc = instrumentedRpc;
Object.defineProperty(base, "functions", {
  configurable: true,
  get: () => functionsClient,
});

export const supabase = base;
export default supabase;
