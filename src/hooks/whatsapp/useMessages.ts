import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/data/mockMessages";
import {
  isGroupJid, jidToPhone, statusNumToLabel, mapMessageType,
  isMediaType, WHATSAPP_CDN_REGEX, extractDownloadUrl,
} from "./waHelpers";
import { fmtDateTime } from "@/lib/dateUtils";

export interface MessageCacheEntry {
  messages: Message[];
  lastSync: string;
  lastStatusSync: string;
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLimit, setMessageLimit] = useState(50);
  const messageLimitRef = useRef(50);

  // Track which jid is currently selected to prevent stale async updates (P0-3 fix)
  const selectedJidRef = useRef<string | null>(null);

  const lastSyncRef = useRef<string>("1970-01-01T00:00:00Z");
  const lastStatusSyncRef = useRef<string>("1970-01-01T00:00:00Z");
  const mediaUrlCacheRef = useRef<Map<string, string>>(new Map());
  const messagesCacheRef = useRef<Map<string, MessageCacheEntry>>(new Map());

  /* ── resolve media URLs (WhatsApp CDN → uazapi download link) ── */
  const resolveMessageMediaUrl = useCallback(async (row: any): Promise<string | null> => {
    const mappedType = mapMessageType(row?.type, row?.media_url, row?.caption);
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
          body: { id: candidateId, return_link: true, return_base64: false },
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

  /* ── map DB row → UI Message ── */
  const mapDbMessageToUi = useCallback(
    (row: any, mediaUrlOverride?: string | null): Message => {
      const rawPayload = row.raw_payload || {};
      const isGroup = isGroupJid(row.remote_jid || "");
      let senderName: string | undefined;

      if (row.direction === "incoming") {
        if (isGroup) {
          senderName =
            rawPayload?.senderName || rawPayload?.pushName || rawPayload?.verifiedBizName ||
            rawPayload?.key?.participant?.replace(/@.*$/, "") ||
            rawPayload?.participant?.replace(/@.*$/, "") ||
            jidToPhone(row.remote_jid);
        }
      } else if (row.direction === "outgoing" && isGroup) {
        // Only show sender name in groups, not in 1:1 chats
        senderName = rawPayload?.senderName || rawPayload?.pushName || undefined;
      }

      const createdAt = new Date(row.created_at);
      // Resolve replyTo from quoted_message_id or raw_payload contextInfo
      let replyTo: { id: string; content: string; senderName: string } | undefined;
      const quotedId = row.quoted_message_id
        || rawPayload?.contextInfo?.stanzaID
        || rawPayload?.content?.contextInfo?.stanzaID
        || null;

      if (quotedId) {
        // Extract quoted message content from raw_payload contextInfo
        const ci = rawPayload?.content?.contextInfo || rawPayload?.contextInfo || {};
        const qm = ci?.quotedMessage || {};

        // Try text from all possible message types
        const quotedText = qm?.conversation
          || qm?.extendedTextMessage?.text
          || qm?.imageMessage?.caption
          || qm?.videoMessage?.caption
          || qm?.documentMessage?.caption
          || (qm?.imageMessage ? "[Foto]" : null)
          || (qm?.videoMessage ? "[Video]" : null)
          || (qm?.audioMessage || qm?.pttMessage ? "[Audio]" : null)
          || (qm?.documentMessage ? "[Documento]" : null)
          || (qm?.stickerMessage ? "[Sticker]" : null)
          || (qm?.contactMessage || qm?.contactsArrayMessage ? "[Contato]" : null)
          || (qm?.locationMessage ? "[Localizacao]" : null)
          || "Mensagem";

        const quotedSender = ci?.participant?.replace(/@.*$/, "")
          || ci?.remoteJID?.replace(/@.*$/, "")
          || "";

        replyTo = {
          id: quotedId,
          content: String(quotedText).substring(0, 200),
          senderName: quotedSender || "Mensagem",
        };
      }

      return {
        id: row.id,
        providerMessageId: row.message_id || null,
        conversationId: row.remote_jid,
        content: row.body || row.caption || `[${row.type}]`,
        timestamp: fmtDateTime(createdAt),
        _sortTs: createdAt.getTime(),
        direction: row.direction === "outgoing" ? "outgoing" : "incoming",
        type: mapMessageType(row.type, row.media_url, row.caption),
        status: statusNumToLabel(row.status ?? 0),
        senderName,
        mediaUrl: mediaUrlOverride ?? row.media_url ?? null,
        caption: row.caption || null,
        replyTo,
      };
    },
    []
  );

  /* ── dedup helper: updates state + cache atomically ── */
  const updateMessagesWithCache = useCallback((jid: string, updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const raw = updater(prev);
      const seen = new Set<string>();
      const next = raw.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      messagesCacheRef.current.set(jid, {
        messages: next,
        lastSync: lastSyncRef.current,
        lastStatusSync: lastStatusSyncRef.current,
      });
      return next;
    });
  }, []);

  /* ── fetch messages for a conversation ── */
  const fetchMessages = useCallback(
    async (compositeId: string, forceRefresh = false, limit?: number) => {
      const effectiveLimit = limit ?? messageLimitRef.current;
      // Parse composite key: "instance_name::remote_jid" or plain "remote_jid"
      const hasComposite = compositeId.includes("::");
      const instanceName = hasComposite ? compositeId.split("::")[0] : "";
      const jid = hasComposite ? compositeId.split("::").slice(1).join("::") : compositeId;

      // Show cached messages instantly
      const cached = messagesCacheRef.current.get(compositeId);
      if (cached && !forceRefresh) {
        setMessages(cached.messages);
        lastSyncRef.current = cached.lastSync;
        lastStatusSyncRef.current = cached.lastStatusSync;
      }

      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("remote_jid", jid)
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);
      // Filter by instance_name if we have a composite key
      if (instanceName) query = query.eq("instance_name", instanceName);
      const { data: rawData } = await query;

      // P0-3 FIX: If user switched conversations while this was loading, discard result
      if (selectedJidRef.current !== compositeId) return;

      const data = rawData ? [...rawData].reverse() : null;

      if (data) {
        const resolvedRows = await Promise.all(
          data.map(async (row: any) => ({
            row,
            resolvedMediaUrl: await resolveMessageMediaUrl(row),
          }))
        );

        // P0-3 FIX: Re-check after async media resolution
        if (selectedJidRef.current !== compositeId) return;

        // Heuristic: if outgoing message (status<=2) has later incoming reply, upgrade to "read"
        const lastIncomingTime = (() => {
          for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].direction === "incoming") return new Date(data[i].created_at).getTime();
          }
          return 0;
        })();

        const mapped: Message[] = resolvedRows.map(({ row, resolvedMediaUrl }) => {
          const msg = mapDbMessageToUi(row, resolvedMediaUrl);
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

        // Merge: keep any cached outgoing messages not yet in DB (recently sent)
        const cached = messagesCacheRef.current.get(jid);
        let merged = mapped;
        if (cached?.messages.length) {
          const dbIds = new Set(mapped.map(m => m.id));
          const recentOutgoing = cached.messages.filter(
            m => m.direction === "outgoing" && !dbIds.has(m.id)
          );
          if (recentOutgoing.length > 0) {
            const all = [...mapped, ...recentOutgoing];
            const seen = new Set<string>();
            merged = all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
            merged.sort((a, b) => ((a as any)._sortTs || 0) - ((b as any)._sortTs || 0));
          }
        }

        messagesCacheRef.current.set(compositeId, {
          messages: merged,
          lastSync: syncTs,
          lastStatusSync: lastStatusSyncRef.current,
        });

        setMessages(merged);
      }
    },
    [mapDbMessageToUi, resolveMessageMediaUrl]
  );

  /* ── select conversation: restore cache + refresh ── */
  const selectConversation = useCallback((jid: string | null) => {
    selectedJidRef.current = jid;

    if (jid) {
      setMessageLimit(50);
      messageLimitRef.current = 50;

      const cached = messagesCacheRef.current.get(jid);
      if (cached) {
        setMessages(cached.messages);
        lastSyncRef.current = cached.lastSync;
        lastStatusSyncRef.current = cached.lastStatusSync;
      } else {
        setMessages([]);
        lastStatusSyncRef.current = "1970-01-01T00:00:00Z";
      }
      fetchMessages(jid, !cached, 50);
    } else {
      setMessages([]);
    }
  }, [fetchMessages]);

  /* ── load more (pagination) ── */
  const loadMoreMessages = useCallback(() => {
    const jid = selectedJidRef.current;
    if (!jid) return;
    const newLimit = messageLimit + 50;
    setMessageLimit(newLimit);
    messageLimitRef.current = newLimit;
    fetchMessages(jid, true, newLimit);
  }, [messageLimit, fetchMessages]);

  return {
    messages,
    messageLimit,
    selectedJidRef,
    lastSyncRef,
    lastStatusSyncRef,
    messagesCacheRef,
    resolveMessageMediaUrl,
    mapDbMessageToUi,
    updateMessagesWithCache,
    fetchMessages,
    selectConversation,
    loadMoreMessages,
  };
}
