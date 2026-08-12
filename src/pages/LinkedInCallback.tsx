import { useEffect } from "react";

export default function LinkedInCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      source: "brainwise-linkedin",
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error"),
      errorDescription: params.get("error_description"),
    };
    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
      Connecting to LinkedIn. You can close this window.
    </div>
  );
}
