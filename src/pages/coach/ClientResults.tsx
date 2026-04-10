import { useSearchParams } from "react-router-dom";
import MyResults from "@/pages/MyResults";

export default function ClientResults() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id") ?? "";
  const assessmentId = searchParams.get("assessment_id") ?? undefined;

  if (!userId) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-muted-foreground">No client specified.</p>
      </div>
    );
  }

  return (
    <MyResults
      isCoachView
      targetUserId={userId}
      preSelectedAssessmentId={assessmentId}
    />
  );
}
