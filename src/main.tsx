import { createRoot } from "react-dom/client";
// Patch the Supabase client before any app module can use it.
import "./integrations/supabase/instrumented";
import App from "./App.tsx";
import "./index.css";
import "./lib/pdfjs-config";
import RootErrorBoundary from "./components/RootErrorBoundary";
import { captureClientError, describeError } from "./lib/errorCapture";

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    try {
      const d = describeError(event.error ?? event.message);
      captureClientError({
        source: "window_error",
        errorCode: d.errorCode,
        message: d.message,
      });
    } catch {
      /* capture must never throw */
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    try {
      const d = describeError(event.reason);
      captureClientError({
        source: "unhandled_rejection",
        errorCode: d.errorCode,
        message: d.message,
      });
    } catch {
      /* capture must never throw */
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
