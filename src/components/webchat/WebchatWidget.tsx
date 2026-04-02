import { fmtTime } from "@/lib/dateUtils";
import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// WEBCHAT WIDGET — Embeddable live chat for customer websites
//
// Aesthetic: Brutalist / Clinical Austerity
// No border-radius, no shadows, no gradients, no cute bubbles.
// Black #000, White #FFF, Gray tones only.
// Font: Inter / system-ui
//
// Props:
//   tenantId: string — identifies which customer owns the widget
//   apiUrl?: string  — Edge Function base URL
//   position?: "bottom-right" | "bottom-left"
// ═══════════════════════════════════════════════════════════════

interface Message {
  id: string;
  text: string;
  direction: "visitor" | "agent";
  timestamp: string;
  sender: string;
  pending?: boolean;
}

interface WebchatWidgetProps {
  tenantId: string;
  apiUrl?: string;
  position?: "bottom-right" | "bottom-left";
}

const API_BASE = "https://supabase.whatsflow.com.br/functions/v1/webchat-api";
const STORAGE_KEY = "wf_webchat_visitor";
const POLL_INTERVAL = 4000;

function generateVisitorId(): string {
  return "v_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
}

export default function WebchatWidget({ tenantId, apiUrl, position = "bottom-right" }: WebchatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const lastTimestampRef = useRef<string>("");

  const endpoint = apiUrl || API_BASE;

  // ── Init visitor ID from localStorage ──
  useEffect(() => {
    let vid = "";
    try {
      vid = localStorage.getItem(STORAGE_KEY) || "";
    } catch { /* private mode */ }
    if (!vid) {
      vid = generateVisitorId();
      try { localStorage.setItem(STORAGE_KEY, vid); } catch {}
    }
    setVisitorId(vid);
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Init session ──
  const initSession = useCallback(async () => {
    if (!visitorId || !tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", tenant_id: tenantId, visitor_id: visitorId }),
      });
      const data = await res.json();
      if (data.session_id) {
        setSessionId(data.session_id);
        setConnected(true);
        const msgs: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id, text: m.text, direction: m.direction, timestamp: m.timestamp, sender: m.sender,
        }));
        setMessages(msgs);
        if (msgs.length > 0) lastTimestampRef.current = msgs[msgs.length - 1].timestamp;
      }
    } catch (err) {
      console.error("[webchat] init error:", err);
    } finally {
      setLoading(false);
    }
  }, [visitorId, tenantId, endpoint]);

  // ── Open handler ──
  useEffect(() => {
    if (open && !connected) initSession();
  }, [open, connected, initSession]);

  // ── Poll for new messages ──
  useEffect(() => {
    if (!open || !sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_messages", tenant_id: tenantId, session_id: sessionId,
            after_timestamp: lastTimestampRef.current || undefined,
          }),
        });
        const data = await res.json();
        if (data.messages?.length > 0) {
          const newMsgs: Message[] = data.messages.map((m: any) => ({
            id: m.id, text: m.text, direction: m.direction, timestamp: m.timestamp, sender: m.sender,
          }));
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const unique = newMsgs.filter((m) => !ids.has(m.id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
          lastTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp;
        }
      } catch { /* silent */ }
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [open, sessionId, tenantId, endpoint]);

  // ── Send message ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistic UI
    setMessages((prev) => [...prev, { id: tempId, text, direction: "visitor", timestamp: now, sender: "visitor", pending: true }]);
    setInput("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", tenant_id: tenantId, session_id: sessionId, visitor_id: visitorId, text }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.message_id, pending: false, timestamp: data.timestamp } : m));
        lastTimestampRef.current = data.timestamp;
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, text: `${text} [ERRO]`, pending: false } : m));
    }
  };

  const isRight = position === "bottom-right";

  // ── Styles ──
  const S = {
    trigger: {
      position: "fixed" as const,
      bottom: 20,
      [isRight ? "right" : "left"]: 20,
      background: "#000",
      color: "#FFF",
      border: "none",
      padding: "14px 24px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase" as const,
      cursor: "pointer",
      fontFamily: "Inter, system-ui, sans-serif",
      zIndex: 99999,
      transition: "opacity 0.15s",
    },
    panel: {
      position: "fixed" as const,
      bottom: 20,
      [isRight ? "right" : "left"]: 20,
      width: 360,
      height: 520,
      background: "#FFF",
      border: "1px solid #000",
      display: "flex",
      flexDirection: "column" as const,
      fontFamily: "Inter, system-ui, sans-serif",
      zIndex: 99999,
      overflow: "hidden",
    },
    header: {
      background: "#000",
      color: "#FFF",
      padding: "12px 16px",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase" as const,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: 16,
      cursor: "pointer",
      padding: "0 4px",
      fontFamily: "monospace",
    },
    msgArea: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "12px 16px",
      background: "#FAFAFA",
    },
    msgVisitor: {
      textAlign: "right" as const,
      marginBottom: 8,
    },
    msgAgent: {
      textAlign: "left" as const,
      marginBottom: 8,
    },
    msgText: (dir: "visitor" | "agent") => ({
      display: "inline-block",
      padding: "8px 12px",
      fontSize: 13,
      lineHeight: 1.4,
      maxWidth: "80%",
      background: dir === "visitor" ? "#000" : "#E8E8E8",
      color: dir === "visitor" ? "#FFF" : "#000",
      fontFamily: "Inter, system-ui, sans-serif",
      textAlign: "left" as const,
    }),
    msgMeta: {
      fontSize: 9,
      color: "#999",
      marginTop: 2,
      fontFamily: "monospace",
    },
    inputArea: {
      display: "flex",
      borderTop: "1px solid #000",
    },
    input: {
      flex: 1,
      border: "none",
      padding: "12px 16px",
      fontSize: 13,
      fontFamily: "Inter, system-ui, sans-serif",
      outline: "none",
      background: "#FFF",
      color: "#000",
    },
    sendBtn: {
      background: "#000",
      color: "#FFF",
      border: "none",
      padding: "12px 20px",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase" as const,
      cursor: "pointer",
      fontFamily: "Inter, system-ui, sans-serif",
    },
  };

  // ── Render ──
  if (!open) {
    return (
      <button style={S.trigger} onClick={() => setOpen(true)} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
        Conexão
      </button>
    );
  }

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span>{connected ? "CONEXÃO ATIVA" : "CONECTANDO..."}</span>
        <button style={S.closeBtn} onClick={() => setOpen(false)}>✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={S.msgArea}>
        {loading && (
          <p style={{ fontSize: 11, color: "#999", textAlign: "center", padding: 20, fontFamily: "monospace" }}>
            ESTABELECENDO CONEXÃO...
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ fontSize: 11, color: "#999", textAlign: "center", padding: 20, fontFamily: "monospace" }}>
            CANAL ABERTO — AGUARDANDO TRANSMISSÃO
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} style={m.direction === "visitor" ? S.msgVisitor : S.msgAgent}>
            <div style={S.msgText(m.direction)}>
              {m.text}
            </div>
            <div style={S.msgMeta}>
              {m.direction === "agent" ? m.sender?.toUpperCase() : "VOCÊ"} ·{" "}
              {fmtTime(m.timestamp)}
              {m.pending && " · ENVIANDO..."}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        <input
          style={S.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={!connected}
          autoFocus
        />
        <button style={S.sendBtn} onClick={handleSend} disabled={!connected || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
