const KEY = "pending_newsletter_opt_in_at";
const TTL_MS = 24 * 60 * 60 * 1000;

export const setPendingNewsletterOptIn = () => {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
};

export const consumePendingNewsletterOptIn = (): boolean => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    localStorage.removeItem(KEY);
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < TTL_MS;
  } catch {
    return false;
  }
};
