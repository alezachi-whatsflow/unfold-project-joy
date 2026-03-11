import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import LeftPanel from "./panels/LeftPanel";
import ChatPanel from "./panels/ChatPanel";
import RightPanel from "./panels/RightPanel";
import type { Conversation } from "@/data/mockConversations";
import type { Message } from "@/data/mockMessages";

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
  if (n >= 4) return "read";
  if (n === 3) return "delivered";
  if (n === 2) return "sent";
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
export default function WhatsAppLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightOpen, setRightOpen] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSyncRef = useRef<string>("1970-01-01T00:00:00Z");
  const didBootstrapSyncRef = useRef(false);
  const mediaUrlCacheRef = useRef<Map<string, string>>(new Map());

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
    // Get latest message per remote_jid
    let { data: allMsgs } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

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

    // Also fetch lead info and contacts
    const [{ data: leads }, { data: contacts }] = await Promise.all([
      supabase.from("whatsapp_leads").select("*"),
      supabase.from("whatsapp_contacts").select("*"),
    ]);
    const leadMap = new Map((leads ?? []).map((l: any) => [l.chat_id, l]));
    const contactMap = new Map((contacts ?? []).map((c: any) => [c.jid, c]));

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
        m.direction === "incoming" && (m.raw_payload?.senderName || m.raw_payload?.pushName)
      );
      const msgName = senderNameFromMsg?.raw_payload?.senderName || senderNameFromMsg?.raw_payload?.pushName || null;

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
        instanceName: latest.instance_name,
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
    async (jid: string) => {
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

        const mapped: Message[] = resolvedRows.map(({ row, resolvedMediaUrl }) =>
          mapDbMessageToUi(row, resolvedMediaUrl)
        );

        setMessages(mapped);
        if (data.length > 0) {
          lastSyncRef.current = data[data.length - 1].created_at;
        }
      }
    },
    [mapDbMessageToUi, resolveMessageMediaUrl]
  );

  /* ── initial load ───────────────────────────────── */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ── load messages when selecting a conversation ── */
  useEffect(() => {
    if (selectedJid) {
      fetchMessages(selectedJid);
    } else {
      setMessages([]);
    }
  }, [selectedJid, fetchMessages]);

  /* ── Realtime subscription + polling fallback ───── */
  useEffect(() => {
    let isActive = true;
    let pollInterval = 3000;

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

            // If the new message belongs to the selected conversation, append it
            if (selectedJid && newMsg.remote_jid === selectedJid && payload.eventType === "INSERT") {
              const resolvedMediaUrl = await resolveMessageMediaUrl(newMsg);

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, mapDbMessageToUi(newMsg, resolvedMediaUrl)];
              });
            }

            // Update status on UPDATE events
            if (payload.eventType === "UPDATE" && selectedJid && newMsg.remote_jid === selectedJid) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === newMsg.id ? { ...m, status: statusNumToLabel(newMsg.status ?? 0) } : m
                )
              );
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

          setMessages((prev) => {
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

          pollInterval = 3000;
        } else {
          pollInterval = Math.min(pollInterval * 1.5, 15000);
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
  }, [selectedJid, fetchConversations, mapDbMessageToUi, resolveMessageMediaUrl]);

  /* ── send message via uazapi ────────────────────── */
  const handleSend = async (text: string) => {
    if (!selectedJid || !text.trim()) return;

    const conv = conversations.find((c) => c.id === selectedJid);
    if (!conv?.instanceName) {
      console.error("Instance not found for selected conversation");
      return;
    }

    const { data: result, error } = await supabase.functions.invoke("uazapi-proxy", {
      body: {
        instanceName: conv.instanceName,
        path: "/send/text",
        method: "POST",
        body: {
          number: jidToPhone(selectedJid),
          text,
        },
      },
    });

    if (error) {
      console.error("Send error:", error);
      return;
    }

    const upstream = (result as any)?.data ?? result;
    const upstreamOk = Boolean((result as any)?.ok ?? true);

    if (!upstreamOk) {
      console.error("uazapi returned non-ok response:", result);
      return;
    }

    // A persistência já é feita no uazapi-proxy (upsert automático após envio).
    // Apenas recarregamos as mensagens para refletir no painel.
    await fetchConversations();
    await fetchMessages(selectedJid);
  };

  const selectedConv = conversations.find((c) => c.id === selectedJid) || null;

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "var(--wa-bg-deep)" }}>
      <div className="shrink-0 h-full hidden md:flex" style={{ width: 360 }}>
        <LeftPanel conversations={conversations} selectedId={selectedJid} onSelect={setSelectedJid} />
      </div>
      <ChatPanel
        conversation={selectedConv}
        messages={messages}
        isRightOpen={rightOpen}
        onToggleRight={() => setRightOpen(!rightOpen)}
        onSend={handleSend}
      />
      <RightPanel
        conversation={selectedConv}
        isOpen={rightOpen}
        onClose={() => setRightOpen(false)}
      />
    </div>
  );
}
