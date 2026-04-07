import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/data/mockMessages";
import type { Conversation } from "@/data/mockConversations";
import type { MessageCacheEntry } from "./useMessages";
import { statusNumToLabel } from "./waHelpers";

interface UseRealtimeSyncOptions {
  selectedJidRef: React.MutableRefObject<string | null>;
  lastSyncRef: React.MutableRefObject<string>;
  lastStatusSyncRef: React.MutableRefObject<string>;
  messagesCacheRef: React.MutableRefObject<Map<string, MessageCacheEntry>>;
  conversations: Conversation[];
  fetchConversations: () => Promise<void>;
  fetchMessages: (jid: string, forceRefresh?: boolean, limit?: number) => Promise<void>;
  resolveMessageMediaUrl: (row: any) => Promise<string | null>;
  mapDbMessageToUi: (row: any, mediaUrlOverride?: string | null) => Message;
  updateMessagesWithCache: (jid: string, updater: (prev: Message[]) => Message[]) => void;
}

export function useRealtimeSync(opts: UseRealtimeSyncOptions) {
  const {
    selectedJidRef, lastSyncRef, lastStatusSyncRef, messagesCacheRef,
    conversations, fetchConversations, fetchMessages,
    resolveMessageMediaUrl, mapDbMessageToUi, updateMessagesWithCache,
  } = opts;

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;
  const fetchMessagesRef = useRef(fetchMessages);
  fetchMessagesRef.current = fetchMessages;
  const resolveMediaRef = useRef(resolveMessageMediaUrl);
  resolveMediaRef.current = resolveMessageMediaUrl;
  const mapMsgRef = useRef(mapDbMessageToUi);
  mapMsgRef.current = mapDbMessageToUi;
  const updateCacheRef = useRef(updateMessagesWithCache);
  updateCacheRef.current = updateMessagesWithCache;

  useEffect(() => {
    let isActive = true;
    let pollInterval = 2000; // P0-4 FIX: start at 2s (was 3s)
    const MAX_POLL_INTERVAL = 6000; // P0-4 FIX: cap at 6s (was 8s)

    /* ── Realtime subscription ──────────────────────── */
    const channel = supabase
      .channel("wa-messages-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          void (async () => {
            try {
            const newMsg = payload?.new as any;
            if (!newMsg?.id || !newMsg?.remote_jid) return; // Guard: skip invalid/DELETE payloads

            fetchConversationsRef.current();

            const msgJid = newMsg.remote_jid;
            const selectedJid = selectedJidRef.current;

            if (payload.eventType === "INSERT") {
              const resolvedMediaUrl = await resolveMediaRef.current(newMsg);
              const uiMsg = mapMsgRef.current(newMsg, resolvedMediaUrl);

              if (selectedJid && msgJid === selectedJid) {
                updateCacheRef.current(selectedJid, (prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, uiMsg];
                });
              } else if (messagesCacheRef.current.has(msgJid)) {
                const cached = messagesCacheRef.current.get(msgJid)!;
                if (!cached.messages.some((m) => m.id === newMsg.id)) {
                  cached.messages = [...cached.messages, uiMsg];
                  cached.lastSync = newMsg.created_at;
                }
              }
            }

            if (payload.eventType === "UPDATE") {
              if (selectedJid && msgJid === selectedJid) {
                updateCacheRef.current(selectedJid, (prev) =>
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

            pollInterval = 2000; // reset on realtime event
            } catch (e) {
              console.warn("[RealtimeSync] Error processing event:", e);
            }
          })();
        }
      )
      .subscribe();

    /* ── Polling fallback ───────────────────────────── */
    const poll = async () => {
      if (!isActive) return;

      await fetchConversationsRef.current();

      const selectedJid = selectedJidRef.current;

      if (selectedJid) {
        let hadUpdates = false;

        // 1) New messages by created_at
        const { data } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("remote_jid", selectedJid)
          .gt("created_at", lastSyncRef.current)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          // P0-3 FIX: verify jid didn't change during await
          if (selectedJidRef.current === selectedJid) {
            const resolvedRows = await Promise.all(
              data.map(async (row: any) => ({
                row,
                resolvedMediaUrl: await resolveMediaRef.current(row),
              }))
            );

            if (selectedJidRef.current === selectedJid) {
              updateCacheRef.current(selectedJid, (prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newMsgs: Message[] = resolvedRows
                  .filter(({ row }) => !existingIds.has(row.id))
                  .map(({ row, resolvedMediaUrl }) => mapMsgRef.current(row, resolvedMediaUrl));

                if (newMsgs.length > 0) {
                  lastSyncRef.current = data[data.length - 1].created_at;
                  return [...prev, ...newMsgs];
                }
                return prev;
              });
            }
          }

          hadUpdates = true;
        }

        // 2) Status updates by updated_at (ticks - P0-2)
        if (selectedJidRef.current === selectedJid) {
          const { data: updatedMsgs } = await supabase
            .from("whatsapp_messages")
            .select("id, status, updated_at")
            .eq("remote_jid", selectedJid)
            .gt("updated_at", lastStatusSyncRef.current)
            .order("updated_at", { ascending: true });

          if (updatedMsgs && updatedMsgs.length > 0 && selectedJidRef.current === selectedJid) {
            const statusMap = new Map(updatedMsgs.map((m: any) => [m.id, m.status]));
            updateCacheRef.current(selectedJid, (prev) =>
              prev.map((m) => {
                const newStatus = statusMap.get(m.id);
                if (newStatus !== undefined) return { ...m, status: statusNumToLabel(newStatus) };
                return m;
              })
            );
            lastStatusSyncRef.current = updatedMsgs[updatedMsgs.length - 1].updated_at;
            hadUpdates = true;
          }
        }

        // 3) Active status sync via uazapi (for WhatsApp Web instances only)
        if (selectedJidRef.current === selectedJid) {
          const conv = conversationsRef.current.find((c) => c.id === selectedJid);
          if (conv?.instanceName && !conv.instanceName.startsWith("meta:") && !conv.instanceName.startsWith("telegram_") && !conv.instanceName.startsWith("mercadolivre_")) {
            try {
              const { data: syncResult } = await supabase.functions.invoke("sync-message-status", {
                body: { instanceName: conv.instanceName, remoteJid: selectedJid },
              });
              if ((syncResult as any)?.statusUpdated > 0 && selectedJidRef.current === selectedJid) {
                hadUpdates = true;
                const { data: refreshed } = await supabase
                  .from("whatsapp_messages")
                  .select("id, status")
                  .eq("remote_jid", selectedJid)
                  .eq("direction", "outgoing")
                  .gte("status", 3);
                if (refreshed && refreshed.length > 0 && selectedJidRef.current === selectedJid) {
                  const readMap = new Map(refreshed.map((m: any) => [m.id, m.status]));
                  updateCacheRef.current(selectedJid, (prev) =>
                    prev.map((m) => {
                      const s = readMap.get(m.id);
                      return s !== undefined ? { ...m, status: statusNumToLabel(s) } : m;
                    })
                  );
                }
              }
            } catch { /* best-effort */ }
          }
        }

        pollInterval = hadUpdates ? 2000 : Math.min(pollInterval * 1.3, MAX_POLL_INTERVAL);
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
  // CRITICAL: Do NOT include `conversations` in deps — it changes every poll cycle
  // and would destroy+recreate the realtime channel + polling loop continuously.
  // The poll function reads conversations via closure from the ref-based opts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
