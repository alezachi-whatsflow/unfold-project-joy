import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenants } from "./useUserTenants";

export interface ChannelIntegration {
  id: string;
  tenant_id: string;
  provider: "WABA" | "INSTAGRAM";
  channel_id: string;
  name: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  waba_id: string | null;
  instagram_business_account_id: string | null;
  facebook_page_id: string | null;
  instagram_username: string | null;
  webhook_verify_token: string;
  webhook_url: string | null;
  status: "active" | "inactive" | "pending" | "error";
  default_queue: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useChannelIntegrations() {
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["channel-integrations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("channel_integrations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ChannelIntegration[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["channel-integrations"] });

  return { ...query, tenantId, invalidate };
}
