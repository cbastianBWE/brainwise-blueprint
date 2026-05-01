// Sanitized 5xx error response. Logs the full error server-side and
// returns a generic message to the caller. Do NOT pass user-validation
// failures (4xx) through this — those should keep their descriptive
// messages.

export function serverError(
  label: string,
  err: unknown,
  headers: Record<string, string>
): Response {
  console.error(`[${label}] error:`, err);
  return new Response(
    JSON.stringify({ error: 'Internal server error' }),
    {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    }
  );
}
