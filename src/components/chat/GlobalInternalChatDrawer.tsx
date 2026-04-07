/**
 * GlobalInternalChatDrawer — Slack/Teams-style sidebar chat for team P2P messaging
 * + Notification bell with @mention alerts
 */
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useMyChats, useChatMessages, useNotifications, type InternalChat } from "@/hooks/useInternalChat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageCircle, X, Send, Bell, ChevronLeft, Loader2, CheckCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtDateTime } from "@/lib/dateUtils"
import { useNavigate } from "react-router-dom"

export function GlobalInternalChatDrawer() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "chat" | "notifications">("list")
  const [selectedChat, setSelectedChat] = useState<InternalChat | null>(null)

  const { data: chats = [], isLoading: chatsLoading } = useMyChats()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { messages, isLoading: msgsLoading, sendMessage } = useChatMessages(selectedChat?.id || null)
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)

  // Realtime for new chat messages
  useEffect(() => {
    if (!selectedChat?.id) return
    const channel = supabase
      .channel(`internal-chat-${selectedChat.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "internal_chat_messages",
        filter: `chat_id=eq.${selectedChat.id}`,
      }, (payload: any) => {
        if (payload?.new?.id) {
          // refetch handled by mutation invalidation
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedChat?.id])

  // Realtime for notifications
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "internal_notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {})
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage.mutate({ content: input.trim() })
    setInput("")
  }

  const openChat = (chat: InternalChat) => {
    setSelectedChat(chat)
    setView("chat")
  }

  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {/* Notification Bell */}
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full shadow-lg relative"
          onClick={() => { setOpen(true); setView("notifications") }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        {/* Chat Button */}
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => { setOpen(o => !o); setView("list") }}
        >
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 h-[480px] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-card">
            {view !== "list" && (
              <button onClick={() => { setView("list"); setSelectedChat(null) }} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="text-sm font-semibold flex-1">
              {view === "list" ? "Chat Interno" : view === "notifications" ? "Notificacoes" : selectedChat?.name || "Conversa"}
            </h3>
            {view === "notifications" && unreadCount > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-[10px] text-primary hover:underline">
                Marcar todas lidas
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {view === "list" && (
            <ScrollArea className="flex-1">
              {chatsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : chats.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Nenhuma conversa</p>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className="w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-xs font-medium truncate">{chat.name || "Conversa direta"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {chat.type === "ticket_thread" ? "Thread de ticket" : chat.type}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
          )}

          {view === "notifications" && (
            <ScrollArea className="flex-1">
              {notifications.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Sem notificacoes</p>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead.mutate(n.id)
                      if (n.link) navigate(n.link)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium flex-1 truncate">{n.title}</p>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                    <p className="text-[9px] text-muted-foreground mt-0.5">{fmtDateTime(n.created_at)}</p>
                  </button>
                ))
              )}
            </ScrollArea>
          )}

          {view === "chat" && selectedChat && (
            <>
              <ScrollArea className="flex-1 p-3">
                {msgsLoading && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                <div className="space-y-2">
                  {messages.map(m => {
                    const isMe = m.sender_id === user.id
                    return (
                      <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] px-2.5 py-1.5 rounded-lg text-xs", isMe ? "bg-primary/15" : "bg-muted")}>
                          {!isMe && <p className="text-[10px] font-semibold text-primary mb-0.5">{m.sender_name}</p>}
                          {m.content_type === "mention_alert" ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
                              <p className="text-[10px] text-amber-600 font-medium">{m.content}</p>
                              {m.metadata?.ticket_id && (
                                <button
                                  onClick={() => {
                                    navigate(m.metadata.link || "#")
                                    setOpen(false)
                                  }}
                                  className="text-[9px] text-primary hover:underline mt-0.5 block"
                                >
                                  Abrir ticket
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          )}
                          <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{fmtDateTime(m.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-border p-2 flex gap-1.5">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Mensagem..."
                  className="h-8 text-xs"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
