import { useAccountRole } from "@/lib/accountRoles";
import { Navigate } from "react-router-dom";

interface PractitionerCoachGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard for coach-affordance pages (clients, order-assessment,
 * client-results, invoices, profile, certification).
 *
 * Allows access when the user has is_practitioner_coach=true on their users
 * row, regardless of account_type. Real coaches and super admin practitioner
 * coaches (Pattern C) both pass; everyone else gets redirected to /dashboard.
 */
export default function PractitionerCoachGuard({ children }: PractitionerCoachGuardProps) {
  const { isPractitionerCoach, loading } = useAccountRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPractitionerCoach) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
