export type AiErrorInfo = {
  title: string;
  message: string;
  retryable: boolean;
  blockingPanel?: boolean;
};

export function mapAiError(input: unknown): AiErrorInfo {
  const e: any = input ?? {};
  const code: string | undefined =
    e.error || e.code || (typeof e === "string" ? e : undefined);
  const serverMsg: string | undefined = e.message;

  switch (code) {
    case "IMPERSONATION_DENIED":
    case "impersonation_denied":
      return {
        title: "Unavailable in impersonation",
        message:
          "AI authoring isn't available during impersonation. Exit impersonation to use this feature.",
        retryable: false,
        blockingPanel: true,
      };
    case "super_admin_required":
      return {
        title: "Not allowed",
        message: "AI authoring is restricted to super admins.",
        retryable: false,
        blockingPanel: true,
      };
    case "file_too_large":
      return { title: "File too large", message: "This file is too large. Max 25MB.", retryable: false };
    case "unsupported_file_type":
      return {
        title: "Unsupported file",
        message: "Only PDF, DOCX, PPTX, TXT, and MD files can be attached.",
        retryable: false,
      };
    case "legacy_ppt_not_supported":
      return {
        title: "Legacy PowerPoint",
        message: "PowerPoint files must be saved as .pptx (modern format). Please re-save and try again.",
        retryable: false,
      };
    case "extraction_failed":
    case "extraction_empty":
      return {
        title: "Couldn't read document",
        message: "Couldn't read text from this document. It may be scanned-only or password-protected.",
        retryable: false,
      };
    case "conversation_token_budget_exceeded":
      return {
        title: "Context limit reached",
        message: "You've reached the context limit for attached documents. Remove a doc to add more.",
        retryable: false,
      };
    case "ai_output_unparseable":
      return {
        title: "AI returned bad output",
        message: "AI returned an unparseable response. Try again or rephrase.",
        retryable: true,
      };
    case "anthropic_api_failure":
      return {
        title: "AI temporarily unavailable",
        message: "AI service is temporarily unavailable. Try again in a moment.",
        retryable: true,
      };
    default:
      return {
        title: "Something went wrong",
        message: serverMsg || (typeof e?.toString === "function" ? String(e?.message ?? code ?? "Unknown error") : "Unknown error"),
        retryable: true,
      };
  }
}
