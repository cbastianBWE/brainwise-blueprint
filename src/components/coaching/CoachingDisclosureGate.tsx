import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CoachingDisclosureModal } from "./CoachingDisclosureModal";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DisclosureStatus {
  not_applicable?: boolean;
  acceptance_required?: boolean;
  already_accepted?: boolean;
  version_id?: string;
  version_hash?: string;
  body_markdown?: string;
  effective_from?: string;
  error?: string;
}

interface Props {
  children: React.ReactNode;
  /**
   * Only for routes that can show someone else's coaching (the session route).
   * When true, a viewer who is not the session owner is let straight through:
   * the disclosure is written for the person doing the writing.
   * Any lookup failure falls through to the normal gate (fail closed).
   */
  skipWhenViewingOther?: boolean;
}

export function CoachingDisclosureGate({ children, skipWhenViewingOther }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { sessionId } = useParams<{ sessionId: string }>();

  const ownership = useQuery({
    queryKey: ["coaching-session-owner", sessionId, user?.id],
    enabled: !!user && !!skipWhenViewingOther && !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_activity_sessions")
        .select("user_id")
        .eq("id", sessionId!)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.user_id as string | undefined) ?? null;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: status, isLoading, error } = useQuery({
    queryKey: ["client-coaching-disclosure-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_coaching_disclosure_status" as any);
      if (error) throw error;
      return (data ?? {}) as DisclosureStatus;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (!user) return <>{children}</>;

  const checkingOwnership =
    !!skipWhenViewingOther && !!sessionId && (ownership.isLoading || ownership.isPending);

  if (isLoading || checkingOwnership) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Viewing someone else's session: their disclosure is not ours to accept.
  if (
    skipWhenViewingOther &&
    sessionId &&
    !ownership.error &&
    ownership.data &&
    ownership.data !== user.id
  ) {
    return <>{children}</>;
  }

  if (error || !status || status.not_applicable || !status.acceptance_required || status.already_accepted) {
    return <>{children}</>;
  }

  if (!status.version_id || !status.version_hash || !status.body_markdown) {
    return <>{children}</>;
  }

  return (
    <CoachingDisclosureModal
      versionId={status.version_id}
      versionHash={status.version_hash}
      bodyMarkdown={status.body_markdown}
      effectiveFrom={status.effective_from}
      onAccepted={() => {
        queryClient.invalidateQueries({ queryKey: ["client-coaching-disclosure-status"] });
      }}
    />
  );
}
