import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/data/mockConversations";
import {
  isGroupJid, jidToPhone, phoneInitials, groupInitials,
  colorFromJid, formatTime, detectChannel,
} from "./waHelpers";
import { callUazapi } from "@/services/uazapiService";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const didBootstrapSyncRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* ── fetch conversations (distinct remote_jid) ──── */
  const fetchConversations = useCallback(async () => {
    // Get current user's tenant to enforce isolation (even for Admin Core users)
    const tenantId = localStorage.getItem("whatsflow_default_tenant_id");

    let instQuery = supabase.from("whatsapp_instances").select("instance_name");
    if (tenantId) instQuery = instQuery.eq("tenant_id", tenantId);
    const { data: instances } = await instQuery;
    const instanceNames = (instances ?? []).map((i: any) => i.instance_name);

    let intgQuery = supabase
      .from("channel_integrations")
      .select("provider, bot_username, id, phone_number_id, facebook_page_id, instagram_business_account_id, tenant_id")
      .eq("status", "active");
    if (tenantId) intgQuery = intgQuery.eq("tenant_id", tenantId);
    const { data: integrations } = await intgQuery;
    for (const intg of integrations ?? []) {
      const p = (intg.provider || "").toUpperCase();
      if (p === "WABA" && intg.phone_number_id) {
        instanceNames.push(`cloud_api_${intg.phone_number_id}`);
      } else if (p === "INSTAGRAM" && intg.facebook_page_id) {
        instanceNames.push(`instagram_${intg.facebook_page_id}`);
      } else if (p === "MESSENGER" && intg.facebook_page_id) {
        instanceNames.push(`messenger_${intg.facebook_page_id}`);
      } else if (p === "TELEGRAM") {
        instanceNames.push(`telegram_${intg.bot_username || intg.id}`);
      } else {
        instanceNames.push(`${p.toLowerCase()}_${intg.id}`);
      }
    }

    let query = supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (instanceNames.length > 0) {
      query = query.in("instance_name", instanceNames);
    }

    let { data: allMsgs } = await query;

    if ((!allMsgs || allMsgs.length === 0) && !didBootstrapSyncRef.current) {
      didBootstrapSyncRef.current = true;
      const { error: syncError } = await supabase.functions.invoke("sync-uazapi-messages");
      if (!syncError) {
        const { data: reloaded } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);
        allMsgs = reloaded ?? [];
      }
    }

    if (!allMsgs || allMsgs.length === 0) {
      setConversations([]);
      return;
    }

    // Group by instance_name + remote_jid (composite key)
    // This ensures same contact on different numbers = separate chats
    const grouped = new Map<string, typeof allMsgs>();
    for (const m of allMsgs) {
      const key = `${m.instance_name}::${m.remote_jid}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const [{ data: leads }, { data: contacts }, { data: slaRules }] = await Promise.all([
      tenantId
        ? supabase.from("whatsapp_leads").select("*").eq("tenant_id", tenantId)
        : supabase.from("whatsapp_leads").select("*"),
      supabase.from("whatsapp_contacts").select("*"),
      tenantId
        ? supabase.from("sla_rules").select("*").eq("tenant_id", tenantId).eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);

    const slaMap = new Map<string | null, any>();
    for (const rule of slaRules ?? []) slaMap.set(rule.department_id, rule);
    // Lead map: composite key (instance_name::chat_id) + fallback by chat_id only
    const leadMap = new Map<string, any>();
    for (const l of leads ?? []) {
      leadMap.set(`${l.instance_name}::${l.chat_id}`, l);
      if (!leadMap.has(l.chat_id)) leadMap.set(l.chat_id, l); // fallback
    }

    // Build contact map with multiple lookup keys for robust avatar matching
    const contactMap = new Map<string, any>();
    for (const c of contacts ?? []) {
      if (c.jid) contactMap.set(c.jid, c);
      if (c.phone) {
        contactMap.set(c.phone, c);
        if (!c.phone.includes("@")) contactMap.set(`${c.phone}@s.whatsapp.net`, c);
        // Also index by last 8-11 digits for fuzzy matching (country code variations)
        const digits = c.phone.replace(/\D/g, "");
        if (digits.length >= 8) contactMap.set(digits.slice(-11), c);
      }
    }

    const convs: Conversation[] = [];
    for (const [compositeKey, jidMsgs] of grouped) {
      const sorted = jidMsgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0];
      const jid = latest.remote_jid;
      const instanceName = latest.instance_name;
      const unread = sorted.filter((m: any) => m.direction === "incoming" && (m.status ?? 0) < 4).length;
      const phone = jidToPhone(jid);
      // Lead lookup: prefer composite key, fallback to jid-only
      const lead = (leadMap.get(`${instanceName}::${jid}`) || leadMap.get(jid)) as any;
      const isGroup = isGroupJid(jid);

      // Robust contact lookup: try jid, then phone@s.whatsapp.net, then phone, then digits
      const contact =
        contactMap.get(jid) ??
        contactMap.get(`${phone}@s.whatsapp.net`) ??
        contactMap.get(phone) ??
        contactMap.get(phone.replace(/\D/g, "").slice(-11)) ??
        null;

      const senderNameFromMsg = sorted.find((m: any) =>
        m.direction === "incoming" && (m.sender_name || m.raw_payload?.senderName || m.raw_payload?.pushName || m.raw_payload?.from_user?.first_name)
      );
      const msgName = senderNameFromMsg?.sender_name
        || senderNameFromMsg?.raw_payload?.senderName
        || senderNameFromMsg?.raw_payload?.pushName
        || (senderNameFromMsg?.raw_payload?.from_user ? [senderNameFromMsg.raw_payload.from_user.first_name, senderNameFromMsg.raw_payload.from_user.last_name].filter(Boolean).join(" ") : null)
        || null;

      let groupSubject: string | null = null;
      if (isGroup) {
        for (const m of sorted) {
          const rp = m.raw_payload;
          groupSubject = rp?.groupSubject || rp?.subject || rp?.groupName || rp?.chat?.name || rp?.chat?.subject || rp?.key?.groupSubject || null;
          if (groupSubject) break;
        }
      }

      const name = isGroup
        ? groupSubject || lead?.lead_full_name || lead?.lead_name || `Grupo ${phone}`
        : lead?.lead_full_name || lead?.lead_name || contact?.push_name || contact?.name || msgName || phone;

      const avatarUrl = contact?.profile_pic_url || null;

      let slaBreach = false;
      if (slaMap.size > 0 && !isGroup) {
        const slaRule = slaMap.get(lead?.department_id ?? null) || slaMap.get(null);
        if (slaRule) {
          const firstIncoming = sorted.findLast((m: any) => m.direction === "incoming");
          if (firstIncoming) {
            const firstOutgoing = sorted.find((m: any) =>
              m.direction === "outgoing" && new Date(m.created_at) > new Date(firstIncoming.created_at)
            );
            const now = Date.now();
            const incomingTime = new Date(firstIncoming.created_at).getTime();
            const elapsedMinutes = (now - incomingTime) / 60000;
            if (!firstOutgoing && elapsedMinutes > slaRule.first_response_minutes) slaBreach = true;
            const oldestIncoming = sorted.findLast((m: any) => m.direction === "incoming");
            if (oldestIncoming) {
              const totalElapsed = (now - new Date(oldestIncoming.created_at).getTime()) / 60000;
              if (totalElapsed > slaRule.resolution_minutes && lead?.lead_status !== "resolved") slaBreach = true;
            }
          }
        }
      }

      convs.push({
        id: compositeKey, name, phone,
        lastMessage: latest.body || latest.caption || `[${latest.type}]`,
        lastMessageTime: formatTime(latest.created_at),
        lastMessageType: (latest.type === "text" ? "text" : latest.type === "audio" ? "audio" : latest.type === "image" ? "image" : "document") as any,
        unreadCount: unread,
        isOnline: false,
        avatarColor: colorFromJid(jid),
        avatarInitials: isGroup ? groupInitials(name) : phoneInitials(phone),
        avatarUrl: avatarUrl || undefined,
        instanceName: latest.instance_name,
        slaBreach,
        channel: detectChannel(latest.instance_name),
        tags: lead?.lead_tags?.length ? lead.lead_tags.map((t: string) => ({ label: t, color: "lead" as const })) : [],
        isTicketOpen: lead?.is_ticket_open ?? false,
        assignedTo: lead?.assigned_attendant_id ?? undefined,
        status: lead?.lead_status === "resolved" ? "resolved" : "open",
        isGroup,
      });
    }

    convs.sort((a, b) => {
      const aTime = grouped.get(a.id)![0].created_at;
      const bTime = grouped.get(b.id)![0].created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(convs);
  }, []);

  /* ── trigger initial load + avatar sync ──── */
  useEffect(() => {
    fetchConversations();

    // Sync avatars directly via uazapi (no Edge Function needed)
    (async () => {
      try {
        const { data: contacts } = await (supabase as any)
          .from("whatsapp_contacts")
          .select("id, jid, phone, instance_name, profile_pic_url")
          .is("profile_pic_url", null)
          .limit(30);

        if (!contacts || contacts.length === 0) return;

        // Group by instance for batch calls
        const byInstance = new Map<string, any[]>();
        for (const c of contacts) {
          if (!c.instance_name) continue;
          if (!byInstance.has(c.instance_name)) byInstance.set(c.instance_name, []);
          byInstance.get(c.instance_name)!.push(c);
        }

        for (const [instName, instContacts] of byInstance) {
          for (const contact of instContacts.slice(0, 10)) {
            try {
              const phone = contact.jid?.replace(/@.*$/, "") || contact.phone;
              if (!phone) continue;
              const result = await callUazapi(instName, "/chat/details", "POST", { number: phone, preview: true });
              const picUrl = result?.data?.imagePreview || result?.data?.image || result?.data?.profilePicUrl || null;
              if (picUrl) {
                await (supabase as any)
                  .from("whatsapp_contacts")
                  .update({ profile_pic_url: picUrl, updated_at: new Date().toISOString() })
                  .eq("id", contact.id);
              }
            } catch { /* skip individual errors */ }
          }
        }

        // Reload conversations to show new avatars
        fetchConversations();
      } catch { /* best-effort */ }
    })();
  }, [fetchConversations]);

  /* ── assign / resolve ──── */
  const assignConversation = useCallback(async (compositeId: string) => {
    if (!currentUserId) { toast.error("Usuario nao identificado"); return; }
    const tId = localStorage.getItem("whatsflow_default_tenant_id");
    const conv = conversations.find((c) => c.id === compositeId);
    // Extract jid from composite key (instance_name::remote_jid)
    const chatId = compositeId.includes("::") ? compositeId.split("::").slice(1).join("::") : compositeId;
    const instanceName = conv?.instanceName || (compositeId.includes("::") ? compositeId.split("::")[0] : "");
    const { error: upsertErr } = await supabase
      .from("whatsapp_leads")
      .upsert({
        chat_id: chatId,
        instance_name: instanceName,
        lead_name: conv?.name || chatId,
        assigned_attendant_id: currentUserId,
        lead_status: "open",
        is_ticket_open: true,
        tenant_id: tId,
      }, { onConflict: "instance_name,chat_id" });

    if (upsertErr) {
      toast.error(`Erro ao atender: ${upsertErr.message}`);
      return;
    }

    toast.success(`Atendimento iniciado: ${conv?.name || chatId}`);
    setConversations((prev) =>
      prev.map((c) => c.id === compositeId ? { ...c, assignedTo: currentUserId, status: "open" as const } : c)
    );
    fetchConversations();
  }, [currentUserId, conversations, fetchConversations]);

  const resolveConversation = useCallback(async (compositeId: string) => {
    const chatId = compositeId.includes("::") ? compositeId.split("::").slice(1).join("::") : compositeId;
    const conv = conversations.find((c) => c.id === compositeId);
    const instanceName = conv?.instanceName || (compositeId.includes("::") ? compositeId.split("::")[0] : "");

    let query = supabase
      .from("whatsapp_leads")
      .update({ lead_status: "resolved", is_ticket_open: false })
      .eq("chat_id", chatId);
    if (instanceName) query = query.eq("instance_name", instanceName);

    const { error } = await query;

    if (error) toast.error(`Erro ao finalizar: ${error.message}`);
    else toast.success("Atendimento finalizado");

    setConversations((prev) =>
      prev.map((c) => c.id === jid ? { ...c, status: "resolved" as const } : c)
    );
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentUserId,
    fetchConversations,
    assignConversation,
    resolveConversation,
  };
}
