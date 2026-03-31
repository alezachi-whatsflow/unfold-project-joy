import { supabase } from "@/integrations/supabase/client";

// Utilitário: chamada via proxy uazapi
export const callProxy = async (
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object,
  instanceName?: string,
  tenantId?: string
) => {
  const resp = await supabase.functions.invoke("uazapi-proxy", {
    body: { path, method, body, instanceName, tenantId },
  });
  if (resp.error) throw resp.error;
  const envelope = resp.data;
  // Proxy now wraps upstream response: { data, upstream_status, ok }
  if (envelope && typeof envelope.ok !== "undefined") {
    if (!envelope.ok) {
      console.warn(`uazapi upstream ${envelope.upstream_status}:`, envelope.data);
    }
    return envelope.data;
  }
  return envelope;
};

export const instanceService = {
  /**
   * POST /instance/init (admintoken)
   * Criar nova instância e persistir no Supabase.
   * O token retornado na RAIZ do response é o instance_token a salvar.
   */
  create: async (params: {
    name: string;
    tenantId: string;
    systemName?: string;
    adminField01?: string;
    adminField02?: string;
  }) => {
    const result = await callProxy("/instance/init", "POST", {
      name: params.name,
      systemName: params.systemName || "whatsflow",
      adminField01: params.adminField01,
      adminField02: params.adminField02,
    }, undefined, params.tenantId);
    const inst = result?.instance || {};
    const instanceToken = result?.token;
    const instanceName = result?.name ?? params.name;

    if (instanceToken) {
      // 1. Save instance to DB with tenant_id
      await supabase.from("whatsapp_instances").upsert(
        {
          tenant_id: params.tenantId,
          instance_name: instanceName,
          instance_token: instanceToken,
          status: "disconnected", // Always start as disconnected until QR is scanned
          qr_code: inst.qrcode ?? null,
          pair_code: inst.paircode ?? null,
          profile_name: inst.profileName ?? null,
          profile_pic_url: inst.profilePicUrl ?? null,
          is_business: inst.isBusiness ?? false,
          platform: inst.plataform ?? null,
          system_name: inst.systemName ?? "whatsflow",
          owner_email: inst.owner ?? null,
          current_presence: inst.currentPresence ?? "available",
          chatbot_enabled: inst.chatbot_enabled ?? false,
          chatbot_ignore_groups: inst.chatbot_ignoreGroups ?? true,
          chatbot_stop_keyword: inst.chatbot_stopConversation ?? "parar",
          chatbot_stop_minutes: inst.chatbot_stopMinutes ?? 60,
          api_created_at: inst.created ?? null,
          api_updated_at: inst.updated ?? null,
          label: instanceName,
          session_id: instanceName,
          provedor: "uazapi",
          token_api: instanceToken,
        },
        { onConflict: "session_id" }
      );

      // 2. Configure webhook automatically (addUrlEvents: false!)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br";
      const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;

      try {
        await callProxy("/webhook", "POST", {
          url: webhookUrl,
          enabled: true,
          addUrlEvents: false,
          addUrlTypesMessages: false,
          events: ["connection", "messages", "messages.upsert", "messages_update", "messages.update", "message_ack", "ack", "leads", "status", "history"],
          excludeMessages: [],
        }, instanceName);

        await supabase
          .from("whatsapp_instances")
          .update({ webhook_url: webhookUrl })
          .eq("instance_name", instanceName);
      } catch (e) {
        console.warn("Webhook setup failed, continuing:", e);
      }
    }

    return result;
  },

  /**
   * POST /instance/connect (token)
   * Se passar phone → gera paircode (5 min timeout)
   * Se não passar phone → gera QR Code (2 min timeout)
   */
  connect: (instanceName: string, phone?: string) =>
    callProxy("/instance/connect", "POST", phone ? { phone } : {}, instanceName),

  /**
   * POST /instance/disconnect (token)
   */
  disconnect: (instanceName: string) =>
    callProxy("/instance/disconnect", "POST", {}, instanceName),

  /**
   * GET /instance/status (token)
   */
  getStatus: (instanceName: string) =>
    callProxy("/instance/status", "GET", undefined, instanceName),

  /**
   * GET /instance/all (admintoken)
   */
  listAll: () => callProxy("/instance/all", "GET"),

  /**
   * DELETE /instance (token)
   */
  delete: async (instanceName: string) => {
    const result = await callProxy("/instance", "DELETE", {}, instanceName);
    await supabase.from("whatsapp_instances").delete().eq("instance_name", instanceName);
    return result;
  },

  /**
   * POST /instance/updatechatbotsettings (token)
   */
  updateChatbotSettings: async (
    instanceName: string,
    settings: {
      openai_apikey?: string;
      chatbot_enabled?: boolean;
      chatbot_ignoreGroups?: boolean;
      chatbot_stopConversation?: string;
      chatbot_stopMinutes?: number;
      chatbot_stopWhenYouSendMsg?: number;
    }
  ) => {
    // Send all settings to uazapi (including openai_apikey for the remote chatbot)
    const result = await callProxy("/instance/updatechatbotsettings", "POST", settings, instanceName);
    // Only persist chatbot behavior flags locally (API key stays on uazapi side only)
    await supabase.from("whatsapp_instances").update({
      chatbot_enabled: settings.chatbot_enabled,
      chatbot_ignore_groups: settings.chatbot_ignoreGroups,
      chatbot_stop_keyword: settings.chatbot_stopConversation,
      chatbot_stop_minutes: settings.chatbot_stopMinutes,
    }).eq("instance_name", instanceName);
    return result;
  },

  /**
   * GET/POST /instance/privacy (token)
   */
  getPrivacy: (instanceName: string) =>
    callProxy("/instance/privacy", "GET", undefined, instanceName),

  updatePrivacy: (
    instanceName: string,
    settings: {
      groupadd?: "all" | "contacts" | "none";
      last?: "all" | "contacts" | "none";
      status?: "all" | "contacts" | "none";
      profile?: "all" | "contacts" | "none";
      readreceipts?: "all" | "none";
      online?: "all" | "match_last_seen";
    }
  ) => callProxy("/instance/privacy", "POST", settings, instanceName),

  /**
   * POST /instance/presence (token)
   */
  setPresence: (instanceName: string, presence: "available" | "unavailable") =>
    callProxy("/instance/presence", "POST", { presence }, instanceName),

  /**
   * POST /profile/name + POST /profile/image (token)
   */
  updateProfileName: (instanceName: string, name: string) =>
    callProxy("/profile/name", "POST", { name }, instanceName),

  updateProfileImage: (instanceName: string, imageUrlOrBase64: string) =>
    callProxy("/profile/image", "POST", { image: imageUrlOrBase64 }, instanceName),

  /**
   * POST /instance/updateDelaySettings (token)
   */
  updateDelaySettings: (instanceName: string, delayMin: number, delayMax: number) =>
    callProxy("/instance/updateDelaySettings", "POST", {
      msg_delay_min: delayMin,
      msg_delay_max: delayMax,
    }, instanceName),

  /**
   * Sincronizar dados da API para o Supabase
   */
  syncAll: async () => {
    const instances = (await callProxy("/instance/all", "GET")) as any[];
    if (!Array.isArray(instances)) return;
    for (const inst of instances) {
      await supabase.from("whatsapp_instances").update({
        status: inst.status,
        profile_name: inst.profileName,
        profile_pic_url: inst.profilePicUrl,
        is_business: inst.isBusiness,
        platform: inst.plataform,
        current_presence: inst.currentPresence,
        last_disconnect: inst.lastDisconnect,
        last_disconnect_reason: inst.lastDisconnectReason,
        chatbot_enabled: inst.chatbot_enabled,
        api_updated_at: inst.updated,
      }).eq("instance_name", inst.name);
    }
  },
};
