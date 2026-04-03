/**
 * Backend Socket.io Hook — Realtime via Backend Horizontal
 *
 * Replaces direct Supabase Realtime subscriptions for heavy tables.
 * The Backend emits events after processing queue jobs,
 * scoped to tenant rooms.
 *
 * Usage:
 *   const { isConnected } = useBackendSocket({
 *     onNewMessage: (msg) => { ... },
 *     onMessageStatus: (update) => { ... },
 *   });
 *
 * Graceful degradation: if VITE_BACKEND_URL is not set,
 * this hook does nothing and the existing Supabase Realtime continues.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface SocketEvents {
  onNewMessage?: (msg: any) => void;
  onMessageStatus?: (update: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onExpenseCreated?: (expense: any) => void;
  onCampaignProgress?: (progress: any) => void;
}

export function useBackendSocket(events: SocketEvents = {}) {
  const tenantId = useTenantId();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Graceful degradation: skip if backend not configured
    if (!BACKEND_URL || !tenantId) return;

    let socket: Socket;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      socket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        socket.emit("join-tenant", tenantId);
        console.log("[socket] Connected to backend, joined tenant:", tenantId);
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        console.log("[socket] Disconnected from backend");
      });

      // ── Event listeners ──
      if (events.onNewMessage) socket.on("new_message", events.onNewMessage);
      if (events.onMessageStatus) socket.on("message_status", events.onMessageStatus);
      if (events.onTicketUpdated) socket.on("ticket_updated", events.onTicketUpdated);
      if (events.onExpenseCreated) socket.on("expense_created", events.onExpenseCreated);
      if (events.onCampaignProgress) socket.on("campaign_progress", events.onCampaignProgress);
    })();

    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [BACKEND_URL, tenantId]); // Reconnect if tenant changes

  return { isConnected, socket: socketRef.current };
}
