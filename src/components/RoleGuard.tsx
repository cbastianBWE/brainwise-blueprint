import { useUserProfile } from "@/hooks/useUserProfile";
import { Navigate } from "react-router-dom";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile, loading } = useUserProfile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.account_type ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
