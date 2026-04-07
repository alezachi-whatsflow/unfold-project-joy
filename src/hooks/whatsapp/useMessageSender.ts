import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/data/mockConversations";
import type { AttachmentPayload } from "@/components/whatsapp/chat/ChatInput";
import { isGroupJid, jidToPhone } from "./waHelpers";
import { callUazapi } from "@/services/uazapiService";
import { getTenantId } from "@/lib/tenantResolver";
import { isBackendAvailable, messagesApi } from "@/lib/apiClient";

interface UseMessageSenderOptions {
  selectedJidRef: React.MutableRefObject<string | null>;
  conversations: Conversation[];
  fetchConversations: () => Promise<void>;
  fetchMessages: (jid: string, forceRefresh?: boolean, limit?: number) => Promise<void>;
}

export function useMessageSender(opts: UseMessageSenderOptions) {
  const { selectedJidRef, conversations, fetchConversations, fetchMessages } = opts;

  /* ── signature cache ── */
  const signatureCacheRef = useRef<{ enabled: boolean; text: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("signature_enabled, signature_text")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            signatureCacheRef.current = {
              enabled: profile.signature_enabled ?? false,
              text: profile.signature_text ?? "",
            };
          }
        });
    });
  }, []);

  const isMetaConversation = (n: string) => n?.startsWith("meta:");
  const isMessengerConversation = (n: string) => n?.startsWith("messenger:");
  const isInstagramConversation = (n: string) => n?.startsWith("instagram:");

  /* ── send text ── */
  const handleSend = useCallback(async (text: string, options?: { replyId?: string }) => {
    const selectedJid = selectedJidRef.current;
    if (!selectedJid || !text.trim()) return;

    let finalText = text.trim();
    const sig = signatureCacheRef.current;
    if (sig?.enabled && sig.text.trim()) {
      // Signature at the TOP in bold (*name* format for WhatsApp) + 2 line breaks
      finalText = `*${sig.text}*\n\n${finalText}`;
    }

    const conv = conversations.find((c) => c.id === selectedJid);
    if (!conv?.instanceName) {
      console.error("Instance not found for selected conversation");
      return;
    }

    const isGroup = isGroupJid(selectedJid);

    if (isMessengerConversation(conv.instanceName)) {
      const pageId = conv.instanceName.replace("messenger:", "");
      const { error } = await supabase.functions.invoke("messenger-send", {
        body: { page_id: pageId, recipient_psid: selectedJid.replace("@messenger", ""), text: finalText },
      });
      if (error) { console.error("Messenger send error:", error); return; }
    } else if (isMetaConversation(conv.instanceName) || isInstagramConversation(conv.instanceName)) {
      const phoneNumberId = conv.instanceName.replace("meta:", "").replace("instagram:", "");
      const { data: result, error } = await supabase.functions.invoke("meta-proxy", {
        body: { action: "send-text", phone: jidToPhone(selectedJid), message: finalText, phone_number_id: phoneNumberId, ...(options?.replyId ? { context_message_id: options.replyId } : {}) },
      });
      if (error || !(result as any)?.ok) { console.error("Meta send error:", error || result); return; }
    } else if (conv.instanceName?.startsWith("mercadolivre_")) {
      const { error } = await supabase.functions.invoke("ml-send", {
        body: { type: "message", pack_id: selectedJid.replace("ml_", "").replace("@mercadolivre", ""), text: finalText },
      });
      if (error) { console.error("ML send error:", error); return; }
      await supabase.from("whatsapp_messages").insert({
        instance_name: conv.instanceName, remote_jid: selectedJid,
        message_id: `ml_out_${Date.now()}`, direction: "outgoing", type: "text",
        body: finalText, status: 4, tenant_id: await getTenantId().catch(() => null),
      });
    } else if (conv.instanceName?.startsWith("telegram_")) {
      const chatId = selectedJid.replace("tg_", "").replace("@telegram", "");
      const tId = await getTenantId().catch(() => null);
      const { data: tgResult, error: tgError } = await supabase.functions.invoke("telegram-send", {
        body: { chat_id: Number(chatId), text: finalText, tenant_id: tId },
      });
      if (tgError || tgResult?.error) {
        toast.error(`Erro ao enviar: ${tgResult?.error || tgError?.message || "Falha no envio"}`);
        return;
      }
      await supabase.from("whatsapp_messages").insert({
        instance_name: conv.instanceName, remote_jid: selectedJid,
        message_id: `tg_out_${Date.now()}`, direction: "outgoing", type: "text",
        body: finalText, status: 4, tenant_id: tId,
      });
    } else {
      // Feature Toggle: Backend API vs Direct uazapi
      try {
        if (isBackendAvailable()) {
          // NEW PATH: Send via Backend API → BullMQ → 202 Accepted
          await messagesApi.send({
            instanceName: conv.instanceName,
            recipientJid: isGroup ? selectedJid : jidToPhone(selectedJid),
            text: finalText,
            isGroup,
            ...(options?.replyId ? { replyid: options.replyId } : {}),
          });
        } else {
          // LEGACY PATH: Direct uazapi call (current behavior)
          await callUazapi(conv.instanceName, "/send/text", "POST", {
            number: isGroup ? selectedJid : jidToPhone(selectedJid),
            text: finalText,
            ...(options?.replyId ? { replyid: options.replyId } : {}),
          });
        }
      } catch (err: any) {
        console.error("Send error:", err);
        toast.error(`Erro ao enviar: ${err.message || "Falha no envio"}`);
        return;
      }
    }

    // Refresh conversation list only (last message preview)
    // Polling/realtime will sync the sent message — no fetchMessages here to avoid reorder flicker
    fetchConversations();
  }, [selectedJidRef, conversations, fetchConversations]);

  /* ── send attachment ── */
  const handleSendAttachment = useCallback(async (payload: AttachmentPayload) => {
    const selectedJid = selectedJidRef.current;
    if (!selectedJid) return;
    const conv = conversations.find((c) => c.id === selectedJid);
    if (!conv?.instanceName) return;

    const isGroup = isGroupJid(selectedJid);
    const number = isGroup ? selectedJid : jidToPhone(selectedJid);

    if (isMetaConversation(conv.instanceName)) {
      const phoneNumberId = conv.instanceName.replace("meta:", "");
      const actionMap: Record<string, string> = {
        image: "send-image", video: "send-video", audio: "send-audio", document: "send-document",
      };

      if (payload.type === "media") {
        const action = actionMap[payload.mediaType || "document"] || "send-document";
        const { error } = await supabase.functions.invoke("meta-proxy", {
          body: {
            action, phone: jidToPhone(selectedJid), message: payload.text || "",
            media_url: payload.file, media_type: payload.mediaType, phone_number_id: phoneNumberId,
          },
        });
        if (error) { console.error("Meta attachment error:", error); throw error; }
      }
    } else {
      let path = "/send/text";
      let body: Record<string, any> = { number };

      switch (payload.type) {
        case "media":
          path = "/send/media";
          body = { number, type: payload.mediaType, file: payload.file, text: payload.text || "" };
          break;
        case "location":
          path = "/send/location";
          body = { number, latitude: payload.latitude, longitude: payload.longitude, name: payload.name || "" };
          break;
        case "contact":
          path = "/send/contact";
          body = { number, name: payload.name, phone: payload.phone };
          break;
        case "poll":
          path = "/send/menu";
          body = { number, type: "poll", text: payload.question, choices: payload.options.map((o: string) => ({ label: o })), selectableCount: 1 };
          break;
      }

      try {
        if (isBackendAvailable() && payload.type === "media") {
          // NEW PATH: Backend API for media
          await messagesApi.sendMedia({
            instanceName: conv.instanceName,
            recipientJid: number,
            mediaType: payload.mediaType || "document",
            mediaUrl: payload.file,
            caption: payload.text || "",
          });
        } else {
          // LEGACY PATH: Direct uazapi
          await callUazapi(conv.instanceName, path, "POST", body);
        }
      } catch (err: any) {
        console.error("Attachment send error:", err);
        throw err;
      }
    }

    // Refresh conversation list only (last message preview)
    // Polling/realtime will sync the sent message — no fetchMessages here to avoid reorder flicker
    fetchConversations();
  }, [selectedJidRef, conversations, fetchConversations]);

  return { handleSend, handleSendAttachment };
}
