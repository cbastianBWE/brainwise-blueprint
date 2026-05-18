import { useAccountRole } from "@/lib/accountRoles";
import { Navigate } from "react-router-dom";

interface MentorGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard for the Mentor Portal (/mentor, /mentor/trainee/:id).
 *
 * Allows access when users.is_mentor=true OR account_type='brainwise_super_admin'.
 * Everyone else is redirected to /dashboard. Mentor capability is a standalone
 * flag independent of account_type; both real coaches and other roles can be
 * mentors once granted by a super admin via set_mentor_role.
 */
export default function MentorGuard({ children }: MentorGuardProps) {
  const { isMentor, isSuperAdmin, loading } = useAccountRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isMentor && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
