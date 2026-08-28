import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureClientError, describeError } from "@/lib/errorCapture";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    try {
      const d = describeError(error);
      captureClientError({
        source: "render",
        errorCode: d.errorCode,
        message: d.message,
      });
    } catch {
      /* never rethrow from the capture layer */
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Sorry about that. Reloading the page usually sorts it out.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
