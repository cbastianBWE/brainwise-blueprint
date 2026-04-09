import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

interface SuperAdminSessionContextType {
  sessionId: string;
}

const SuperAdminSessionContext = createContext<SuperAdminSessionContextType>({
  sessionId: "",
});

export const useSuperAdminSession = () => useContext(SuperAdminSessionContext);

export function SuperAdminSessionProvider({ children }: { children: ReactNode }) {
  const [sessionId] = useState(() => crypto.randomUUID());

  return (
    <SuperAdminSessionContext.Provider value={{ sessionId }}>
      {children}
    </SuperAdminSessionContext.Provider>
  );
}
