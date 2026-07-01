import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrustedDeviceSettings {
  window_days: number;
  impersonation_window_hours: number;
  enabled: boolean;
}

export interface TrustedDevice {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  impersonation_trusted_at: string | null;
}

export function useTrustedDeviceSettings() {
  return useQuery({
    queryKey: ["trusted-device-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trusted_device_settings" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as TrustedDeviceSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useTrustedDevices(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["trusted-devices", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_trusted_devices" as any);
      if (error) throw error;
      return (data ?? []) as TrustedDevice[];
    },
    enabled: !!userId,
  });
}

export function useRevokeTrustedDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p_id: string) => {
      const { error } = await supabase.rpc("revoke_trusted_device" as any, { p_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trusted-devices"] });
    },
  });
}
