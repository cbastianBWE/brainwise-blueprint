import { supabase } from "@/integrations/supabase/client";

export type IdentityMutationAction =
  | { action: "update_password"; new_password: string }
  | { action: "update_email"; new_email: string }
  | { action: "mfa_enroll" }
  | { action: "mfa_unenroll"; factor_id: string };

export interface IdentityMutationResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const IMPERSONATION_DENIED_MESSAGE =
  "This action is blocked while impersonating. Identity changes (email, password, MFA) are not permitted during impersonation, even in act mode.";

export async function callIdentityMutation<T = any>(
  body: IdentityMutationAction,
): Promise<IdentityMutationResult<T>> {
  const { data, error } = await supabase.functions.invoke("identity-mutation", { body });

  if (!error && data && !data.error) {
    return { ok: true, data: data as T };
  }

  if (error) {
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const parsed = await ctx.json();
        const code = parsed?.code as string | undefined;
        const friendly =
          code === "IMPERSONATION_DENIED"
            ? IMPERSONATION_DENIED_MESSAGE
            : (parsed?.error as string) || error.message;
        return { ok: false, error: friendly, code };
      }
    } catch {
      // fall through
    }
    return { ok: false, error: error.message };
  }

  if (data?.error) {
    const code = data.code as string | undefined;
    const friendly =
      code === "IMPERSONATION_DENIED" ? IMPERSONATION_DENIED_MESSAGE : data.error;
    return { ok: false, error: friendly, code };
  }

  return { ok: false, error: "Unknown error" };
}
