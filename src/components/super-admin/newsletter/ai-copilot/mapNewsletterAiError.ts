/**
 * Maps an unknown error from supabase.functions.invoke('newsletter_ai_generate')
 * (or a network failure) to a user-readable string.
 *
 * supabase-js wraps non-2xx responses in a FunctionsHttpError whose body is
 * available via `err.context.json()` or, in newer versions, on `err.context`.
 * We probe several shapes to find a `{ code, message }` envelope.
 */

const FRIENDLY: Record<string, string> = {
  spec_not_loaded: "The co-pilot's authoring spec isn't loaded. Contact support.",
  anthropic_api_failure: "The AI service returned an error. Try again in a moment.",
  IMPERSONATION_DENIED: "The co-pilot is not available during impersonation.",
  super_admin_required: "You don't have permission to use the co-pilot.",
  article_not_found: "This article no longer exists. Reload the page.",
  user_message_too_long: "Your message is too long. Keep it under 100,000 characters.",
  too_many_attachments: "Too many attachments.",
};

const FALLBACK = "Something went wrong. Try again.";

async function readContextBody(err: unknown): Promise<unknown> {
  const ctx = (err as { context?: unknown })?.context;
  if (!ctx) return null;
  // FunctionsHttpError.context is typically a Response in newer supabase-js.
  if (typeof (ctx as Response).json === "function") {
    try {
      return await (ctx as Response).clone().json();
    } catch {
      try {
        return await (ctx as Response).clone().text();
      } catch {
        return null;
      }
    }
  }
  // Older shapes: object with .body
  if (typeof ctx === "object" && ctx !== null) {
    const body = (ctx as { body?: unknown }).body;
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    if (body) return body;
    return ctx;
  }
  return null;
}

export async function mapNewsletterAiError(err: unknown): Promise<string> {
  if (!err) return FALLBACK;

  // 1) Try the response-body envelope first.
  const body = await readContextBody(err);
  if (body && typeof body === "object") {
    const code = (body as { code?: string; error?: string }).code
      ?? (body as { error?: string }).error;
    if (typeof code === "string" && FRIENDLY[code]) return FRIENDLY[code];
  }

  // 2) Direct properties on the error itself.
  const direct =
    (err as { code?: string }).code ??
    (err as { error?: string }).error;
  if (typeof direct === "string" && FRIENDLY[direct]) return FRIENDLY[direct];

  // 3) Network / abort.
  const name = (err as { name?: string }).name;
  if (name === "AbortError") return "Request cancelled.";

  return FALLBACK;
}
