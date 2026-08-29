import { useQuery, useQueryClient } from "@tanstack/react-query";
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
}

export function CoachingDisclosureGate({ children }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
