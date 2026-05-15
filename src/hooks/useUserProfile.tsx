import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  full_name: string | null;
  account_type: string | null;
  email: string;
  subscription_status: string;
  subscription_tier: string;
  is_practitioner_coach: boolean;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("full_name, account_type, email, subscription_status, subscription_tier, is_practitioner_coach")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  return { profile, loading };
};
