// Cookie consent utilities. Pure client-side. No backend.
// Versioned key — bump CONSENT_VERSION to re-prompt all users on policy change.

export const CONSENT_STORAGE_KEY = "bw_cookie_consent_v1";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "bw-cookie-consent-changed";
export const OPEN_SETTINGS_EVENT = "open-cookie-settings";

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: number;
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsent(): boolean {
  return getConsent() !== null;
}

export function hasCategoryConsent(category: ConsentCategory): boolean {
  const c = getConsent();
  if (!c) return false;
  return c[category] === true;
}

export function setConsent(partial: { analytics: boolean; marketing: boolean }): ConsentState {
  const next: ConsentState = {
    necessary: true,
    analytics: partial.analytics,
    marketing: partial.marketing,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: next }));
  } catch {
    // localStorage unavailable — fail silently
  }
  return next;
}

export function acceptAll(): ConsentState {
  return setConsent({ analytics: true, marketing: true });
}

export function rejectAll(): ConsentState {
  return setConsent({ analytics: false, marketing: false });
}

export function openSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

// Stubbed analytics helper. No-op today — no analytics tooling is wired up.
// When GA4/PostHog/Mixpanel is added, wire the actual call inside the `if` block.
// Centralizes consent gating so future analytics calls don't bypass it.
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!hasCategoryConsent("analytics")) return;
  void eventName;
  void properties;
}
