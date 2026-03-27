import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LeftPanel from "./panels/LeftPanel";
import ChatPanel from "./panels/ChatPanel";
import RightPanel from "./panels/RightPanel";
import { GroupKanbanBoard } from "./groups/GroupKanbanBoard";
import type { Conversation } from "@/data/mockConversations";
import type { Message } from "@/data/mockMessages";
import type { AttachmentPayload } from "./chat/ChatInput";
import type { ChannelType } from "@/components/ui/ChannelIcon";

/* ── helpers ───────────────────────────────────────── */
function isGroupJid(jid: string) {
  return jid?.endsWith("@g.us") ?? false;
}
function jidToPhone(jid: string) {
  return jid?.replace(/@.*$/, "") ?? "";
}
function phoneInitials(phone: string) {
  const clean = phone.replace(/\D/g, "");
  return clean.slice(-2).toUpperCase() || "??";
}
function groupInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "GP";
}
const palette = ["#00A884", "#7C3AED", "#F59E0B", "#EF4444", "#0EA5E9", "#EC4899"];
function colorFromJid(jid: string) {
  let h = 0;
  for (let i = 0; i < jid.length; i++) h = (h * 31 + jid.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function statusNumToLabel(n: number): Message["status"] {
  if (n >= 3) return "read";
  if (n === 2) return "delivered";
  if (n === 1) return "sent";
  return "pending";
}

function mapMessageType(t: string): Message["type"] {
  const lower = (t || "").toLowerCase();
  if (lower.includes("image")) return "image";
  if (lower.includes("video") || lower === "ptv") return "video";
  if (lower.includes("audio") || lower === "ptt") return "audio";
  if (lower.includes("document")) return "document";
  if (lower === "media") return "image";
  return "text";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const WHATSAPP_CDN_REGEX = /(?:^https?:\/\/)?(?:mmg\.whatsapp\.net|[^/]*\.cdn\.whatsapp\.net)/i;

function isMediaType(type: Message["type"]) {
  return type === "image" || type === "video" || type === "audio" || type === "document";
}

function extractDownloadUrl(payload: any): string | null {
  return (
    payload?.fileURL ??
    payload?.fileUrl ??
    payload?.url ??
    payload?.data?.fileURL ??
    payload?.data?.fileUrl ??
    payload?.data?.url ??
    null
  );
}

/* ── main component ────────────────────────────────── */
interface WhatsAppLayoutProps {
  initialFilter?: "inbox" | "queue" | "groups" | "resolved";
}

export default function WhatsAppLayout({ initialFilter }: WhatsAppLayoutProps = {}) {
  // Get current user ID for queue assignment
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightOpen, setRightOpen] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSyncRef = useRef<string>("1970-01-01T00:00:00Z");
  const lastStatusSyncRef = useRef<string>("1970-01-01T00:00:00Z");
  const didBootstrapSyncRef = useRef(false);
  const mediaUrlCacheRef = useRef<Map<string, string>>(new Map());
  // Message cache: keeps messages in memory per conversation so they persist on switch
  const messagesCacheRef = useRef<Map<string, { messages: Message[]; lastSync: string; lastStatusSync: string }>>(new Map());

  const resolveMessageMediaUrl = useCallback(async (row: any): Promise<string | null> => {
    const mappedType = mapMessageType(row?.type);
    const currentUrl = row?.media_url || null;

    if (!isMediaType(mappedType)) return currentUrl;
    if (currentUrl && !WHATSAPP_CDN_REGEX.test(currentUrl)) return currentUrl;

    const cacheKey = String(row?.message_id || row?.id || "");
    if (cacheKey && mediaUrlCacheRef.current.has(cacheKey)) {
      return mediaUrlCacheRef.current.get(cacheKey)!;
    }

    if (!row?.instance_name || !row?.message_id) return currentUrl;

    const rawMessageId = String(row.message_id);
    const fallbackMessageId = rawMessageId.includes(":") ? rawMessageId.split(":").pop() : null;
    const candidateIds = [...new Set([rawMessageId, fallbackMessageId].filter(Boolean) as string[])];

    for (const candidateId of candidateIds) {
      const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
        body: {
          instanceName: row.instance_name,
          path: "/message/download",
          method: "POST",
          body: {
            id: candidateId,
            return_link: true,
            return_base64: false,
          },
        },
      });

      if (error) continue;

      const resolvedUrl = extractDownloadUrl((data as any)?.data ?? data);
      if (resolvedUrl) {
        if (cacheKey) mediaUrlCacheRef.current.set(cacheKey, resolvedUrl);
        return resolvedUrl;
      }
    }

    return currentUrl;
  }, []);

  const mapDbMessageToUi = useCallback(
    (row: any, mediaUrlOverride?: string | null): Message => {
      // For group messages, extract sender name from raw_payload
      const rawPayload = row.raw_payload || {};
      const isGroup = isGroupJid(row.remote_jid || "");
      let senderName: string | undefined;

      if (row.direction === "incoming") {
        if (isGroup) {
          // In groups, show the actual sender's name (pushName/senderName/participant)
          senderName =
            rawPayload?.senderName ||
            rawPayload?.pushName ||
            rawPayload?.verifiedBizName ||
            rawPayload?.key?.participant?.replace(/@.*$/, "") ||
            rawPayload?.participant?.replace(/@.*$/, "") ||
            jidToPhone(row.remote_jid);
        } else {
          senderName = undefined; // Individual chats don't need sender name on incoming
        }
      } else if (row.direction === "outgoing") {
        // For outgoing in groups, we can show the device owner's name
        senderName = rawPayload?.senderName || rawPayload?.pushName || undefined;
      }

      return {
        id: row.id,
        conversationId: row.remote_jid,
        content: row.body || row.caption || `[${row.type}]`,
        timestamp: new Date(row.created_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        direction: row.direction === "outgoing" ? "outgoing" : "incoming",
        type: mapMessageType(row.type),
        status: statusNumToLabel(row.status ?? 0),
        senderName,
        mediaUrl: mediaUrlOverride ?? row.media_url ?? null,
        caption: row.caption || null,
      };
    },
    []
  );

  /* ── fetch conversations (distinct remote_jid) ──── */
  const fetchConversations = useCallback(async () => {
    // Only show messages from instances the user owns + omnichannel integrations
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("instance_name");
    const instanceNames = (instances ?? []).map((i: any) => i.instance_name);

    // Also include omnichannel instance names (telegram_, webchat_, ml_, messenger_)
    const { data: integrations } = await supabase
      .from("channel_integrations")
      .select("provider, bot_username, id")
      .eq("status", "active");
    for (const intg of integrations ?? []) {
      const prefix = intg.provider?.toLowerCase() || "channel";
      const suffix = intg.bot_username || intg.id;
      instanceNames.push(`${prefix}_${suffix}`);
    }

    // Get latest message per remote_jid, filtered by user's instances
    let query = supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (instanceNames.length > 0) {
      query = query.in("instance_name", instanceNames);
    }

    let { data: allMsgs } = await query;

    // Bootstrap sync (1x) if banco ainda vazio
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

    // Group by remote_jid
    const grouped = new Map<string, typeof allMsgs>();
    for (const m of allMsgs) {
      const jid = m.remote_jid;
      if (!grouped.has(jid)) grouped.set(jid, []);
      grouped.get(jid)!.push(m);
    }

    // Also fetch lead info, contacts and SLA rules
    const tenantId = localStorage.getItem("whatsflow_default_tenant_id");
    const [{ data: leads }, { data: contacts }, { data: slaRules }] = await Promise.all([
      supabase.from("whatsapp_leads").select("*"),
      supabase.from("whatsapp_contacts").select("*"),
      tenantId
        ? supabase.from("sla_rules").select("*").eq("tenant_id", tenantId).eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);
    // Build SLA lookup: department_id → rule (null key = default)
    const slaMap = new Map<string | null, any>();
    for (const rule of slaRules ?? []) {
      slaMap.set(rule.department_id, rule);
    }
    const leadMap = new Map((leads ?? []).map((l: any) => [l.chat_id, l]));
    // Build contact map with multiple keys: jid, phone@s.whatsapp.net, phone
    const contactMap = new Map<string, any>();
    for (const c of contacts ?? []) {
      if (c.jid) contactMap.set(c.jid, c);
      if (c.phone) {
        contactMap.set(c.phone, c);
        if (!c.phone.includes("@")) contactMap.set(`${c.phone}@s.whatsapp.net`, c);
      }
    }

    const convs: Conversation[] = [];
    for (const [jid, jidMsgs] of grouped) {
      const sorted = jidMsgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0];
      const unread = sorted.filter((m: any) => m.direction === "incoming" && (m.status ?? 0) < 4).length;
      const phone = jidToPhone(jid);
      const lead = leadMap.get(jid) as any;
      const contact = contactMap.get(jid) as any;
      const isGroup = isGroupJid(jid);

      // Try to get name from: lead > contact > incoming message senderName/pushName > phone
      const senderNameFromMsg = sorted.find((m: any) =>
        m.direction === "incoming" && (m.sender_name || m.raw_payload?.senderName || m.raw_payload?.pushName || m.raw_payload?.from_user?.first_name)
      );
      const msgName = senderNameFromMsg?.sender_name
        || senderNameFromMsg?.raw_payload?.senderName
        || senderNameFromMsg?.raw_payload?.pushName
        || (senderNameFromMsg?.raw_payload?.from_user ? [senderNameFromMsg.raw_payload.from_user.first_name, senderNameFromMsg.raw_payload.from_user.last_name].filter(Boolean).join(" ") : null)
        || null;

      // For groups, try to get group subject from raw_payload
      let groupSubject: string | null = null;
      if (isGroup) {
        for (const m of sorted) {
          const rp = m.raw_payload;
          groupSubject =
            rp?.groupSubject ||
            rp?.subject ||
            rp?.groupName ||
            rp?.chat?.name ||
            rp?.chat?.subject ||
            rp?.key?.groupSubject ||
            null;
          if (groupSubject) break;
        }
      }

      const name = isGroup
        ? groupSubject || lead?.lead_full_name || lead?.lead_name || `Grupo ${phone}`
        : lead?.lead_full_name ||
          lead?.lead_name ||
          contact?.push_name ||
          contact?.name ||
          msgName ||
          phone;

      // Avatar: prefer profile_pic_url from whatsapp_contacts
      const avatarUrl = contact?.profile_pic_url || null;

      // SLA breach check
      let slaBreach = false;
      if (slaMap.size > 0 && !isGroup) {
        // Find the applicable SLA rule (department-specific or default)
        const slaRule = slaMap.get(lead?.department_id ?? null) || slaMap.get(null);
        if (slaRule) {
          // Find first incoming message without a subsequent outgoing reply
          const firstIncoming = sorted.findLast((m: any) => m.direction === "incoming");
          if (firstIncoming) {
            const firstOutgoing = sorted.find((m: any) =>
              m.direction === "outgoing" && new Date(m.created_at) > new Date(firstIncoming.created_at)
            );
            const now = Date.now();
            const incomingTime = new Date(firstIncoming.created_at).getTime();
            const elapsedMinutes = (now - incomingTime) / 60000;

            if (!firstOutgoing && elapsedMinutes > slaRule.first_response_minutes) {
              slaBreach = true;
            }
            // Also check resolution time for open conversations
            const oldestIncoming = sorted.findLast((m: any) => m.direction === "incoming");
            if (oldestIncoming) {
              const totalElapsed = (now - new Date(oldestIncoming.created_at).getTime()) / 60000;
              if (totalElapsed > slaRule.resolution_minutes && lead?.lead_status !== "resolved") {
                slaBreach = true;
              }
            }
          }
        }
      }

      convs.push({
        id: jid,
        name,
        phone,
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
        channel: (latest.instance_name?.startsWith("meta:") ? "whatsapp_meta"
          : latest.instance_name?.startsWith("messenger:") || latest.instance_name?.startsWith("messenger_") ? "facebook"
          : latest.instance_name?.startsWith("instagram:") || latest.instance_name?.startsWith("instagram_") ? "instagram"
          : latest.instance_name?.startsWith("telegram_") ? "telegram"
          : latest.instance_name?.startsWith("webchat_") ? "webchat"
          : latest.instance_name?.startsWith("mercadolivre_") ? "mercadolivre"
          : "whatsapp_web") as ChannelType,
        tags: lead?.lead_tags?.length
          ? lead.lead_tags.map((t: string) => ({ label: t, color: "lead" as const }))
          : [],
        isTicketOpen: lead?.is_ticket_open ?? false,
        assignedTo: lead?.assigned_attendant_id ?? undefined,
        status: lead?.lead_status === "resolved" ? "resolved" : "open",
        isGroup,
      });
    }

    convs.sort((a, b) => {
      // Sort by last message time (newest first) — use raw data
      const aTime = grouped.get(a.id)![0].created_at;
      const bTime = grouped.get(b.id)![0].created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(convs);
  }, []);

  /* ── fetch messages for selected conversation ──── */
  const fetchMessages = useCallback(
    async (jid: string, forceRefresh = false) => {
      // Show cached messages instantly while we refresh from DB
      const cached = messagesCacheRef.current.get(jid);
      if (cached && !forceRefresh) {
        setMessages(cached.messages);
        lastSyncRef.current = cached.lastSync;
        lastStatusSyncRef.current = cached.lastStatusSync;
        // Don't return — continue to refresh from DB below
      }

      const { data } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("remote_jid", jid)
        .order("created_at", { ascending: true })
        .limit(500);

      if (data) {
        const resolvedRows = await Promise.all(
          data.map(async (row: any) => ({
            row,
            resolvedMediaUrl: await resolveMessageMediaUrl(row),
          }))
        );

        // Heuristic: if an outgoing message (status<=2) has a later incoming reply,
        // the contact must have read it — upgrade to "read" (status=3)
        const lastIncomingTime = (() => {
          for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].direction === "incoming") return new Date(data[i].created_at).getTime();
          }
          return 0;
        })();

        const mapped: Message[] = resolvedRows.map(({ row, resolvedMediaUrl }) => {
          const msg = mapDbMessageToUi(row, resolvedMediaUrl);
          // If outgoing with status<=2 and there's a later incoming message, mark as read
          if (
            msg.direction === "outgoing" &&
            (msg.status === "delivered" || msg.status === "sent") &&
            lastIncomingTime > 0 &&
            new Date(row.created_at).getTime() < lastIncomingTime
          ) {
            msg.status = "read";
          }
          return msg;
        });

        const syncTs = data.length > 0 ? data[data.length - 1].created_at : "1970-01-01T00:00:00Z";
        lastSyncRef.current = syncTs;
        lastStatusSyncRef.current = new Date().toISOString();

        // Save to cache
        messagesCacheRef.current.set(jid, {
          messages: mapped,
          lastSync: syncTs,
          lastStatusSync: lastStatusSyncRef.current,
        });

        setMessages(mapped);
      }
    },
    [mapDbMessageToUi, resolveMessageMediaUrl]
  );

  /* ── initial load ───────────────────────────────── */
  useEffect(() => {
    fetchConversations();
    // Trigger avatar sync in background (best-effort)
    supabase.from("whatsapp_instances").select("instance_name").then(({ data: insts }) => {
      for (const inst of insts ?? []) {
        supabase.functions.invoke("sync-message-status", {
          body: { instanceName: inst.instance_name, syncAvatars: true },
        }).catch(() => {});
      }
    });
  }, [fetchConversations]);

  /* ── load messages when selecting a conversation ── */
  useEffect(() => {
    if (selectedJid) {
      // Show cached messages instantly, then refresh from DB in background
      const cached = messagesCacheRef.current.get(selectedJid);
      if (cached) {
        setMessages(cached.messages);
        lastSyncRef.current = cached.lastSync;
        lastStatusSyncRef.current = cached.lastStatusSync;
      } else {
        setMessages([]);
        lastStatusSyncRef.current = "1970-01-01T00:00:00Z";
      }
      fetchMessages(selectedJid, !cached);
    } else {
      setMessages([]);
    }
  }, [selectedJid, fetchMessages]);

  // Helper to update both state and cache when messages change
  const updateMessagesWithCache = useCallback((jid: string, updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const raw = updater(prev);
      // Dedup by id — prevents race condition between Realtime + polling
      const seen = new Set<string>();
      const next = raw.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      if (next !== prev) {
        messagesCacheRef.current.set(jid, {
          messages: next,
          lastSync: lastSyncRef.current,
          lastStatusSync: lastStatusSyncRef.current,
        });
      }
      return next;
    });
  }, []);

  /* ── Realtime subscription + polling fallback ───── */
  useEffect(() => {
    let isActive = true;
    let pollInterval = 3000;
    const MAX_POLL_INTERVAL = 8000; // cap at 8s instead of 15s for faster updates

    const channel = supabase
      .channel("wa-messages-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          void (async () => {
            const newMsg = payload.new as any;
            if (!newMsg) return;

            // Refresh conversations list
            fetchConversations();

            const msgJid = newMsg.remote_jid;

            // INSERT: append new message (to selected or to cache of any conversation)
            if (payload.eventType === "INSERT") {
              const resolvedMediaUrl = await resolveMessageMediaUrl(newMsg);
              const uiMsg = mapDbMessageToUi(newMsg, resolvedMediaUrl);

              if (selectedJid && msgJid === selectedJid) {
                updateMessagesWithCache(selectedJid, (prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, uiMsg];
                });
              } else if (messagesCacheRef.current.has(msgJid)) {
                // Update cache for non-selected conversations too
                const cached = messagesCacheRef.current.get(msgJid)!;
                if (!cached.messages.some((m) => m.id === newMsg.id)) {
                  cached.messages = [...cached.messages, uiMsg];
                  cached.lastSync = newMsg.created_at;
                }
              }
            }

            // UPDATE: update status (ticks) for any conversation in cache
            if (payload.eventType === "UPDATE") {
              if (selectedJid && msgJid === selectedJid) {
                updateMessagesWithCache(selectedJid, (prev) =>
                  prev.map((m) =>
                    m.id === newMsg.id ? { ...m, status: statusNumToLabel(newMsg.status ?? 0) } : m
                  )
                );
              } else if (messagesCacheRef.current.has(msgJid)) {
                const cached = messagesCacheRef.current.get(msgJid)!;
                cached.messages = cached.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: statusNumToLabel(newMsg.status ?? 0) } : m
                );
              }
            }

            pollInterval = 3000; // reset
          })();
        }
      )
      .subscribe();

    // Polling fallback
    const poll = async () => {
      if (!isActive) return;

      await fetchConversations();

      if (selectedJid) {
        let hadUpdates = false;

        // 1) Fetch NEW messages by created_at
        const { data } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("remote_jid", selectedJid)
          .gt("created_at", lastSyncRef.current)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const resolvedRows = await Promise.all(
            data.map(async (row: any) => ({
              row,
              resolvedMediaUrl: await resolveMessageMediaUrl(row),
            }))
          );

          updateMessagesWithCache(selectedJid, (prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs: Message[] = resolvedRows
              .filter(({ row }) => !existingIds.has(row.id))
              .map(({ row, resolvedMediaUrl }) => mapDbMessageToUi(row, resolvedMediaUrl));

            if (newMsgs.length > 0) {
              lastSyncRef.current = data[data.length - 1].created_at;
              return [...prev, ...newMsgs];
            }
            return prev;
          });

          hadUpdates = true;
        }

        // 2) Fetch STATUS UPDATES via updated_at (catches ack/read changes)
        const { data: updatedMsgs } = await supabase
          .from("whatsapp_messages")
          .select("id, status, updated_at")
          .eq("remote_jid", selectedJid)
          .gt("updated_at", lastStatusSyncRef.current)
          .order("updated_at", { ascending: true });

        if (updatedMsgs && updatedMsgs.length > 0) {
          const statusMap = new Map(updatedMsgs.map((m: any) => [m.id, m.status]));
          updateMessagesWithCache(selectedJid, (prev) =>
            prev.map((m) => {
              const newStatus = statusMap.get(m.id);
              if (newStatus !== undefined) {
                return { ...m, status: statusNumToLabel(newStatus) };
              }
              return m;
            })
          );
          lastStatusSyncRef.current = updatedMsgs[updatedMsgs.length - 1].updated_at;
          hadUpdates = true;
        }

        // 3) Active status sync via uazapi /message/find
        const conv = conversations.find((c) => c.id === selectedJid);
        if (conv?.instanceName && !conv.instanceName.startsWith("meta:")) {
          try {
            const { data: syncResult } = await supabase.functions.invoke("sync-message-status", {
              body: { instanceName: conv.instanceName, remoteJid: selectedJid },
            });
            if ((syncResult as any)?.statusUpdated > 0) {
              hadUpdates = true;
              // Re-fetch updated statuses from DB
              const { data: refreshed } = await supabase
                .from("whatsapp_messages")
                .select("id, status")
                .eq("remote_jid", selectedJid)
                .eq("direction", "outgoing")
                .gte("status", 3);
              if (refreshed && refreshed.length > 0) {
                const readMap = new Map(refreshed.map((m: any) => [m.id, m.status]));
                updateMessagesWithCache(selectedJid, (prev) =>
                  prev.map((m) => {
                    const s = readMap.get(m.id);
                    return s !== undefined ? { ...m, status: statusNumToLabel(s) } : m;
                  })
                );
              }
            }
          } catch {
            // best-effort
          }
        }

        if (hadUpdates) {
          pollInterval = 3000;
        } else {
          pollInterval = Math.min(pollInterval * 1.3, MAX_POLL_INTERVAL);
        }
      }

      if (isActive) {
        pollTimeoutRef.current = setTimeout(poll, pollInterval);
      }
    };

    pollTimeoutRef.current = setTimeout(poll, pollInterval);

    return () => {
      isActive = false;
      clearTimeout(pollTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedJid, fetchConversations, mapDbMessageToUi, resolveMessageMediaUrl, updateMessagesWithCache]);

  /* ── detect conversation channel ─────── */
  const isMetaConversation = (instanceName: string) => instanceName?.startsWith("meta:");
  const isMessengerConversation = (instanceName: string) => instanceName?.startsWith("messenger:");
  const isInstagramConversation = (instanceName: string) => instanceName?.startsWith("instagram:");

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

  /* ── send message (auto-routes uazapi, meta, messenger, instagram) ── */
  const handleSend = async (text: string) => {
    if (!selectedJid || !text.trim()) return;

    // Append signature if enabled
    let finalText = text.trim();
    const sig = signatureCacheRef.current;
    if (sig?.enabled && sig.text.trim()) {
      finalText = `${finalText}\n\n\u2014 ${sig.text}`;
    }

    const conv = conversations.find((c) => c.id === selectedJid);
    if (!conv?.instanceName) {
      console.error("Instance not found for selected conversation");
      return;
    }

    const isGroup = isGroupJid(selectedJid);

    if (isMessengerConversation(conv.instanceName)) {
      // Send via Facebook Messenger
      const pageId = conv.instanceName.replace("messenger:", "");
      const { error } = await supabase.functions.invoke("messenger-send", {
        body: {
          page_id: pageId,
          recipient_psid: selectedJid.replace("@messenger", ""),
          text: finalText,
        },
      });
      if (error) {
        console.error("Messenger send error:", error);
        return;
      }
    } else if (isMetaConversation(conv.instanceName) || isInstagramConversation(conv.instanceName)) {
      // Send via Meta Cloud API (WhatsApp or Instagram)
      const phoneNumberId = conv.instanceName.replace("meta:", "").replace("instagram:", "");
      const { data: result, error } = await supabase.functions.invoke("meta-proxy", {
        body: {
          action: "send-text",
          phone: jidToPhone(selectedJid),
          message: finalText,
          phone_number_id: phoneNumberId,
        },
      });
      if (error || !(result as any)?.ok) {
        console.error("Meta send error:", error || result);
        return;
      }
    } else if (conv.instanceName?.startsWith("mercadolivre_")) {
      // Send via ML
      const { error } = await supabase.functions.invoke("ml-send", {
        body: { type: "message", pack_id: selectedJid.replace("ml_", "").replace("@mercadolivre", ""), text: finalText },
      });
      if (error) { console.error("ML send error:", error); return; }
      await supabase.from("whatsapp_messages").insert({
        instance_name: conv.instanceName,
        remote_jid: selectedJid,
        message_id: `ml_out_${Date.now()}`,
        direction: "outgoing",
        type: "text",
        body: finalText,
        status: 4,
        tenant_id: localStorage.getItem("whatsflow_default_tenant_id"),
      });
    } else if (conv.instanceName?.startsWith("telegram_")) {
      // Send via Telegram Bot API
      const chatId = selectedJid.replace("tg_", "").replace("@telegram", "");
      const tId = localStorage.getItem("whatsflow_default_tenant_id");
      const { data: tgResult, error: tgError } = await supabase.functions.invoke("telegram-send", {
        body: { chat_id: Number(chatId), text: finalText, tenant_id: tId },
      });
      if (tgError || tgResult?.error) {
        console.error("Telegram send error:", tgError || tgResult);
        toast.error(`Erro ao enviar: ${tgResult?.error || tgError?.message || "Falha no envio"}`);
        return;
      }
      // Save outgoing message locally (webhook only saves incoming)
      await supabase.from("whatsapp_messages").insert({
        instance_name: conv.instanceName,
        remote_jid: selectedJid,
        message_id: `tg_out_${Date.now()}`,
        direction: "outgoing",
        type: "text",
        body: finalText,
        status: 4,
        tenant_id: tId,
      });
    } else {
      // Send via uazapi (WhatsApp Web)
      const { data: result, error } = await supabase.functions.invoke("uazapi-proxy", {
        body: {
          instanceName: conv.instanceName,
          path: "/send/text",
          method: "POST",
          body: {
            number: isGroup ? selectedJid : jidToPhone(selectedJid),
            text: finalText,
          },
        },
      });
      if (error) {
        console.error("Send error:", error);
        return;
      }
      const upstreamOk = Boolean((result as any)?.ok ?? true);
      if (!upstreamOk) {
        console.error("uazapi returned non-ok response:", result);
        return;
      }
    }

    // Recarregar
    await fetchConversations();
    await fetchMessages(selectedJid);
  };

  /* ── send attachment (auto-routes uazapi or meta) ── */
  const handleSendAttachment = async (payload: AttachmentPayload) => {
    if (!selectedJid) return;
    const conv = conversations.find((c) => c.id === selectedJid);
    if (!conv?.instanceName) return;

    const isGroup = isGroupJid(selectedJid);
    const number = isGroup ? selectedJid : jidToPhone(selectedJid);

    if (isMetaConversation(conv.instanceName)) {
      // Send via Meta Cloud API
      const phoneNumberId = conv.instanceName.replace("meta:", "");
      const actionMap: Record<string, string> = {
        image: "send-image",
        video: "send-video",
        audio: "send-audio",
        document: "send-document",
      };

      if (payload.type === "media") {
        const action = actionMap[payload.mediaType || "document"] || "send-document";
        const { error } = await supabase.functions.invoke("meta-proxy", {
          body: {
            action,
            phone: jidToPhone(selectedJid),
            message: payload.text || "",
            media_url: payload.file,
            media_type: payload.mediaType,
            phone_number_id: phoneNumberId,
          },
        });
        if (error) { console.error("Meta attachment error:", error); throw error; }
      }
      // Location, contact, poll not yet supported on Meta API in this flow
    } else {
      // Send via uazapi
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
          body = { number, type: "poll", text: payload.question, choices: payload.options.map((o) => ({ label: o })), selectableCount: 1 };
          break;
      }

      const { error } = await supabase.functions.invoke("uazapi-proxy", {
        body: { instanceName: conv.instanceName, path, method: "POST", body },
      });

      if (error) {
        console.error("Attachment send error:", error);
        throw error;
      }
    }

    await fetchConversations();
    await fetchMessages(selectedJid);
  };

  /* ── assign conversation to current user (Iniciar Atendimento) ── */
  const assignConversation = useCallback(async (jid: string) => {
    if (!currentUserId) { toast.error("Usuário não identificado"); return; }
    const tId = localStorage.getItem("whatsflow_default_tenant_id");
    const conv = conversations.find((c) => c.id === jid);

    // Try update first (most leads already exist from webhook auto-creation)
    const { data: updated, error: updateErr } = await supabase
      .from("whatsapp_leads")
      .update({ assigned_attendant_id: currentUserId, lead_status: "open", is_ticket_open: true, tenant_id: tId })
      .eq("chat_id", jid)
      .select("id");

    if (updateErr) {
      console.error("Assign update error:", updateErr);
      toast.error(`Erro ao atender: ${updateErr.message}`);
    }

    // If no rows updated, insert new lead
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from("whatsapp_leads")
        .insert({
          chat_id: jid,
          instance_name: conv?.instanceName || "",
          lead_name: conv?.name || jid,
          assigned_attendant_id: currentUserId,
          lead_status: "open",
          is_ticket_open: true,
          tenant_id: tId,
        });
      if (insertErr) {
        console.error("Assign insert error:", insertErr);
        toast.error(`Erro ao criar lead: ${insertErr.message}`);
        return;
      }
    }

    toast.success(`Atendimento iniciado: ${conv?.name || jid}`);
    // Optimistic: update local state immediately
    setConversations((prev) =>
      prev.map((c) => c.id === jid ? { ...c, assignedTo: currentUserId, status: "open" as const } : c)
    );
    fetchConversations();
  }, [currentUserId, conversations, fetchConversations]);

  /* ── resolve / finalize conversation ── */
  const resolveConversation = useCallback(async (jid: string) => {
    const { error } = await supabase
      .from("whatsapp_leads")
      .update({ lead_status: "resolved", is_ticket_open: false })
      .eq("chat_id", jid);

    if (error) {
      console.error("Resolve error:", error);
      toast.error(`Erro ao finalizar: ${error.message}`);
    } else {
      toast.success("Atendimento finalizado");
    }
    setConversations((prev) =>
      prev.map((c) => c.id === jid ? { ...c, status: "resolved" as const } : c)
    );
    fetchConversations();
  }, [fetchConversations]);

  const selectedConv = conversations.find((c) => c.id === selectedJid) || null;
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [groupViewMode, setGroupViewMode] = useState<"list" | "kanban">("list");

  // Detect if currently on "groups" filter (LeftPanel manages its own filter state,
  const [activeFilter, setActiveFilter] = useState("inbox");
  const showKanban = activeFilter === "groups" && groupViewMode === "kanban";

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--wa-bg-deep, var(--bg-base))" }}>
      {/* Left Panel — conversation list */}
      <div className="shrink-0 h-full hidden md:flex overflow-hidden" style={{ width: 340 }}>
        <LeftPanel
          conversations={conversations}
          selectedId={selectedJid}
          onSelect={setSelectedJid}
          newConvOpen={newConvOpen}
          onNewConvOpenChange={setNewConvOpen}
          onNewConversationStarted={(jid) => {
            fetchConversations();
            setSelectedJid(jid);
          }}
          viewMode={groupViewMode}
          onViewModeChange={setGroupViewMode}
          onFilterChange={setActiveFilter}
          initialFilter={initialFilter}
          onAssignConversation={assignConversation}
        />
      </div>

      {/* Central panel — chat or kanban */}
      {showKanban ? (
        <div className="flex-1 overflow-hidden" style={{ background: "var(--bg-base)" }}>
          <GroupKanbanBoard />
        </div>
      ) : (
        <>
          <ChatPanel
            conversation={selectedConv}
            messages={messages}
            isRightOpen={rightOpen}
            onToggleRight={() => setRightOpen(!rightOpen)}
            onSend={handleSend}
            onSendAttachment={handleSendAttachment}
            onNewConversation={() => setNewConvOpen(true)}
            onAssign={selectedConv ? () => assignConversation(selectedConv.id) : undefined}
            onResolve={selectedConv ? () => resolveConversation(selectedConv.id) : undefined}
            activeFilter={activeFilter}
          />
          <RightPanel
            conversation={selectedConv}
            isOpen={rightOpen}
            onClose={() => setRightOpen(false)}
          />
        </>
      )}
    </div>
  );
}
