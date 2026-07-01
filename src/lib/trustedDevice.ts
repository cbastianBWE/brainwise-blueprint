const KEY = "bw_trusted_device_token";

export function getTrustedDeviceToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setTrustedDeviceToken(raw: string): void {
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* no-op */
  }
}

export function clearTrustedDeviceToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

export function buildDeviceLabel(): string {
  try {
    const ua = navigator.userAgent || "";
    let browser = "Browser";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";

    let os = "device";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
    else if (/Linux/.test(ua)) os = "Linux";

    return `${browser} on ${os}`;
  } catch {
    return "Browser on device";
  }
}
