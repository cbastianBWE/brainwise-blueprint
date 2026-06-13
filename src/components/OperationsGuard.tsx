import { ReactNode, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useOpsMembership } from "@/hooks/useOpsMembership";

interface Props {
  module: "CRM" | "OPERATIONS";
  children: ReactNode;
}

function MembershipCheck({ children }: { children: ReactNode }) {
  const { membership, loading } = useOpsMembership();
  const toastedRef = useRef(false);

  useEffect(() => {
    if (!loading && !membership && !toastedRef.current) {
      toastedRef.current = true;
      toast.error("You don't have access to this workspace.");
    }
  }, [loading, membership]);

  if (loading) return null;
  if (!membership) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function OperationsGuard({ module, children }: Props) {
  return (
    <SubscriptionGate feature={`module:${module}`}>
      <MembershipCheck>{children}</MembershipCheck>
    </SubscriptionGate>
  );
}
