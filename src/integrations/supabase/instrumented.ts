// Instrumented Supabase client.
//
// Same shape and same types as the generated client, but a resolved `error`
// on .rpc() and .functions.invoke() fires a fire-and-forget capture before
// the result is returned completely unchanged.
//
// The generated file (./client.ts) is imported relatively so this module is
// never aliased back onto itself.
import { supabase as base } from "./client";
import { CAPTURE_RPC, captureClientError, describeError } from "@/lib/errorCapture";

type AnyFn = (...args: unknown[]) => unknown;

const rpcOriginal = base.rpc.bind(base) as AnyFn;

const instrumentedRpc = ((...args: unknown[]) => {
  const fn = String(args[0] ?? "");
  const result = rpcOriginal(...args) as any;
  if (!result || typeof result.then !== "function") return result;
  if (fn === CAPTURE_RPC) return result;

  const wrapped = result.then((res: any) => {
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
      }
    } catch {
      /* capture must never affect the caller */
    }
    return res;
  });

  // Preserve the thenable/builder-ish surface as closely as possible.
  return Object.assign(wrapped, {
    then: wrapped.then.bind(wrapped),
    catch: wrapped.catch.bind(wrapped),
    finally: wrapped.finally.bind(wrapped),
  });
}) as typeof base.rpc;

// `base.functions` is a getter that builds a fresh FunctionsClient on every
// access, so patching what it hands back once would be thrown away. Take one
// instance, patch it, and pin it behind a plain property.
const functionsClient = base.functions;
const invokeOriginal = functionsClient.invoke.bind(functionsClient) as AnyFn;

const instrumentedInvoke = (async (...args: unknown[]) => {
  const name = String(args[0] ?? "");
  const res = (await invokeOriginal(...args)) as any;
  try {
    if (res && res.error) {
      const d = describeError(res.error);
      captureClientError({
        source: "invoke",
        operation: name,
        errorCode: d.errorCode,
        message: d.message,
        status: d.status,
        details: d.details,
        hint: d.hint,
      });
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
