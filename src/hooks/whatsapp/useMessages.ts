import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/data/mockMessages";
import {
  isGroupJid, jidToPhone, statusNumToLabel, mapMessageType,
  isMediaType, WHATSAPP_CDN_REGEX, extractDownloadUrl,
} from "./waHelpers";

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
      } else if (row.direction === "outgoing") {
        senderName = rawPayload?.senderName || rawPayload?.pushName || undefined;
      }

      return {
        id: row.id,
        conversationId: row.remote_jid,
        content: row.body || row.caption || `[${row.type}]`,
        timestamp: new Date(row.created_at).toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
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
    async (jid: string, forceRefresh = false, limit?: number) => {
      const effectiveLimit = limit ?? messageLimitRef.current;

      // Show cached messages instantly
      const cached = messagesCacheRef.current.get(jid);
      if (cached && !forceRefresh) {
        setMessages(cached.messages);
        lastSyncRef.current = cached.lastSync;
        lastStatusSyncRef.current = cached.lastStatusSync;
      }

      const { data: rawData } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("remote_jid", jid)
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);

      // P0-3 FIX: If user switched conversations while this was loading, discard result
      if (selectedJidRef.current !== jid) return;

      const data = rawData ? [...rawData].reverse() : null;

      if (data) {
        const resolvedRows = await Promise.all(
          data.map(async (row: any) => ({
            row,
            resolvedMediaUrl: await resolveMessageMediaUrl(row),
          }))
        );

        // P0-3 FIX: Re-check after async media resolution
        if (selectedJidRef.current !== jid) return;

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
