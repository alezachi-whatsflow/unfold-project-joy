import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import ConversationList from "./ConversationList";
import ChatArea from "./ChatArea";
import ContactPanel from "./ContactPanel";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message } from "./mockInboxData";

export default function InboxTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<Record<string, { label: string; status: string }>>({});

  // Fetch conversations from message_logs grouped by conversa_id
  const fetchConversations = useCallback(async () => {
    setLoading(true);

    // Load instances for labels
    const { data: instData } = await supabase
      .from("whatsapp_instances")
      .select("session_id, label, status, instance_name");

    const instMap: Record<string, { label: string; status: string }> = {};
    (instData || []).forEach((i: any) => {
      instMap[i.session_id] = { label: i.label || i.instance_name || i.session_id, status: i.status };
    });
    setInstances(instMap);

    // Load latest messages grouped by conversation
    const { data: logs } = await supabase
      .from("message_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (logs && logs.length > 0) {
      const convMap = new Map<string, any[]>();
      logs.forEach((l: any) => {
        const key = `${l.session_id}::${l.conversa_id}`;
        if (!convMap.has(key)) convMap.set(key, []);
        convMap.get(key)!.push(l);
      });

      const convs: Conversation[] = [];
      convMap.forEach((msgs, key) => {
        const latest = msgs[0]; // already sorted desc
        const unread = msgs.filter((m: any) => m.direcao === "recebido" && m.status !== "read").length;
        const instInfo = instMap[latest.session_id];

        convs.push({
          id: key,
          contactName: latest.conversa_id.replace(/@.*/, "").replace(/^55/, "+55 "),
          contactNumber: latest.conversa_id.replace(/@.*/, ""),
          lastMessage: latest.conteudo?.substring(0, 80) || "(mídia)",
          lastMessageTime: latest.timestamp,
          unreadCount: unread,
          origem: latest.origem as any,
          status: unread > 0 ? "em_atendimento" : "aguardando",
          connectionLabel: instInfo?.label || latest.session_id,
          connectionStatus: instInfo?.status === "connected" ? "connected" : "disconnected",
          isLead: latest.origem === "prospeccao",
          tags: [],
        });
      });

      convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(convs);
    } else {
      // Fallback to mock data when no real data exists
      const { MOCK_CONVERSATIONS } = await import("./mockInboxData");
      setConversations(MOCK_CONVERSATIONS);
    }
    setLoading(false);
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    const [sessionId, conversaId] = convId.split("::");

    if (!conversaId) {
      // Mock data fallback
      const { MOCK_MESSAGES } = await import("./mockInboxData");
      setMessages(MOCK_MESSAGES[convId] || []);
      return;
    }

    const { data } = await supabase
      .from("message_logs")
      .select("*")
      .eq("session_id", sessionId)
      .eq("conversa_id", conversaId)
      .order("timestamp", { ascending: true })
      .limit(200);

    if (data && data.length > 0) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          direcao: m.direcao as "enviado" | "recebido",
          tipo: m.tipo as any,
          conteudo: m.conteudo,
          status: m.status as any,
          timestamp: m.timestamp,
        }))
      );
    } else {
      const { MOCK_MESSAGES } = await import("./mockInboxData");
      setMessages(MOCK_MESSAGES[convId] || []);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    // Realtime subscription for new messages
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "message_logs",
      }, () => {
        fetchConversations();
        if (selectedId) fetchMessages(selectedId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
    else setMessages([]);
  }, [selectedId, fetchMessages]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-lg border border-border overflow-hidden">
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <ChatArea
            conversation={selected}
            messages={messages}
            onTogglePanel={() => setShowPanel(!showPanel)}
            showPanel={showPanel}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecione uma conversa</p>
            <p className="text-sm">Escolha um contato na lista ao lado para iniciar.</p>
          </div>
        )}
      </div>

      {selected && showPanel && (
        <ContactPanel conversation={selected} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
