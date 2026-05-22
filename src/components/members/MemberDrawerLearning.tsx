import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLearningTree from "@/components/learning-admin/AdminLearningTree";
import type { MarkTarget } from "@/components/learning-admin/learning-tree-types";
import JustifiedActionDialog, {
  JustifiedActionResult,
} from "@/components/justified-action/JustifiedActionDialog";

interface Props {
  userId: string;
  setHasUnsavedChanges: (v: boolean) => void;
}

function getActionLabels(t: MarkTarget): {
  title: string;
  description: React.ReactNode;
  successTitle: string;
} {
  if (t.tier === "cert_path") {
    return {
      title: t.complete ? "Grant certification" : "Revoke certification",
      description: (
        <span>
          You are about to {t.complete ? "grant" : "revoke"}{" "}
          <strong>{t.entityName}</strong> for this user.
        </span>
      ),
      successTitle: t.complete ? "Certification granted" : "Certification revoked",
    };
  }
  const tierLabel = {
    content_item: "content item",
    module: "module",
    curriculum: "curriculum",
  }[t.tier];
  return {
    title: t.complete ? `Mark ${tierLabel} complete` : `Mark ${tierLabel} incomplete`,
    description: (
      <span>
        You are about to mark <strong>{t.entityName}</strong>{" "}
        {t.complete ? "complete" : "incomplete"}.
        {t.complete
          ? " This marks the full subtree complete."
          : " This recomputes parent progress only; child item completion is not changed."}
      </span>
    ),
    successTitle: t.complete
      ? `Marked ${tierLabel} complete`
      : `Marked ${tierLabel} incomplete`,
  };
}

export default function MemberDrawerLearning({ userId, setHasUnsavedChanges }: Props) {
  const queryClient = useQueryClient();
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);

  useEffect(() => {
    setHasUnsavedChanges(markTarget !== null);
  }, [markTarget, setHasUnsavedChanges]);

  const labels = markTarget ? getActionLabels(markTarget) : null;

  return (
    <div className="p-4">
      <AdminLearningTree
        userId={userId}
        isImpersonating={false}
        onMark={(t) => setMarkTarget(t)}
      />

      {markTarget && labels && (
        <JustifiedActionDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setMarkTarget(null);
          }}
          title={labels.title}
          description={labels.description}
          successTitle={labels.successTitle}
          onSubmit={async (reason): Promise<JustifiedActionResult> => {
            let rpcName: string;
            let args: Record<string, unknown>;
            if (markTarget.tier === "cert_path") {
              rpcName = markTarget.complete ? "grant_certification" : "revoke_certification";
              args = {
                p_certification_id: markTarget.certificationId,
                p_reason: reason,
              };
            } else if (markTarget.tier === "curriculum") {
              rpcName = "set_curriculum_completion";
              args = {
                p_assignment_id: markTarget.assignmentId,
                p_complete: markTarget.complete,
                p_reason: reason,
              };
            } else if (markTarget.tier === "module") {
              rpcName = "set_module_completion";
              args = {
                p_user_id: markTarget.userId,
                p_module_id: markTarget.moduleId,
                p_complete: markTarget.complete,
                p_reason: reason,
              };
            } else {
              rpcName = "set_content_item_completion";
              args = {
                p_user_id: markTarget.userId,
                p_content_item_id: markTarget.contentItemId,
                p_complete: markTarget.complete,
                p_reason: reason,
              };
            }
            const { data, error } = await supabase.rpc(rpcName as any, args as any);
            if (error) throw error;
            const result = (data ?? {}) as { changed?: boolean; note?: string };
            await queryClient.invalidateQueries({
              queryKey: ["get_user_learning_state", userId],
            });
            return { changed: result.changed ?? true, note: result.note };
          }}
          mapError={(raw) => {
            if (raw.includes("manual_incomplete_blocked_certified_cert_path")) {
              return "This learner is certified on a path that includes this item. Demote the certification first, then retry.";
            }
            if (raw.includes("content_item_not_found_or_archived")) {
              return "This content item no longer exists or was archived.";
            }
            if (raw.includes("module_not_found_or_archived")) {
              return "This module no longer exists or was archived.";
            }
            if (raw.includes("curriculum_assignment_not_found")) {
              return "This curriculum assignment no longer exists.";
            }
            if (raw.includes("curriculum_assignment_unassigned")) {
              return "This curriculum has been unassigned from the learner.";
            }
            if (raw.includes("certification_already_granted")) {
              return "This user already has this certification.";
            }
            if (raw.includes("certification_already_revoked")) {
              return "This certification has already been revoked.";
            }
            return null;
          }}
        />
      )}
    </div>
  );
}
