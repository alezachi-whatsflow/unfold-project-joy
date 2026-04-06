/**
 * CopilotChat — Assistente Autonomo Whatsflow
 * Full chat UI with audio recording, file upload, Whisper transcription,
 * OpenAI Assistants v2 tool_calls, and rich result cards.
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTenantId } from "@/hooks/useTenantId"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send, Mic, MicOff, Paperclip, Image, FileText, X, Loader2, Bot, User,
  StopCircle, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { ToolResultCard } from "./CopilotToolCards"

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolResult {
  tool: string
  success: boolean
  data?: any
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  attachments?: { type: string; name: string; url?: string }[]
  toolResults?: ToolResult[]
  isLoading?: boolean
}

// ── Supabase Edge Function URL helper ────────────────────────────────────────

function edgeFnUrl(name: string): string {
  const base = (supabase as any).supabaseUrl || "https://supabase.whatsflow.com.br"
  return `${base}/functions/v1/${name}`
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
    apikey: (supabase as any).supabaseKey || "",
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function CopilotChat() {
  const tenantId = useTenantId()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ola! Sou o Assistente Autonomo da Whatsflow. Posso ajudar com:\n\n• Registrar despesas (envie foto do recibo)\n• Agendar reunioes e tarefas\n• Resumir textos e audios\n• Consultar despesas por periodo\n• Agendar envio de mensagens\n\nComo posso ajudar?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)

  // Audio recording
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // File attachments
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── Audio Recording ──────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.start(250)
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      toast.error("Nao foi possivel acessar o microfone")
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr) return resolve(new Blob())

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        resolve(blob)
      }
      mr.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      setRecording(false)
    })
  }, [])

  const cancelRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    audioChunksRef.current = []
    setRecording(false)
    setRecordingTime(0)
  }, [])

  const handleSendAudio = useCallback(async () => {
    const blob = await stopRecording()
    if (blob.size < 1000) { toast.error("Audio muito curto"); return }

    setTranscribing(true)
    try {
      const headers = await getAuthHeaders()
      // Convert blob to base64
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      const res = await fetch(edgeFnUrl("process-audio-input"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          audio_base64: base64,
          mime_type: "audio/webm",
          tenant_id: tenantId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro na transcricao")

      if (data.transcription) {
        setInput(prev => prev ? `${prev}\n${data.transcription}` : data.transcription)
        toast.success("Audio transcrito com sucesso")
      }
    } catch (e: any) {
      toast.error("Erro ao transcrever audio: " + e.message)
    } finally {
      setTranscribing(false)
    }
  }, [stopRecording, tenantId])

  // ── File Upload ──────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024) // 10MB max
    if (valid.length < files.length) toast.error("Arquivos acima de 10MB foram ignorados")
    setAttachments(prev => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin"
    const path = `copilot/${tenantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from("attachments").upload(path, file)
    if (error) {
      console.error("Upload error:", error)
      return null
    }

    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path)
    return urlData.publicUrl
  }

  // ── Send Message ─────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && attachments.length === 0) return
    if (!tenantId || !user?.id) { toast.error("Sessao invalida"); return }

    setSending(true)

    // Build user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
      attachments: attachments.map(f => ({
        type: f.type.startsWith("image") ? "image" : "file",
        name: f.name,
      })),
    }
    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput("")
    setAttachments([])

    try {
      // Upload attachments
      let imageUrl: string | undefined
      for (const file of attachments) {
        const url = await uploadFile(file)
        if (url && file.type.startsWith("image")) imageUrl = url
      }

      // Call copilot-run Edge Function
      const headers = await getAuthHeaders()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const res = await fetch(edgeFnUrl("copilot-run"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          thread_id: threadId,
          message: text,
          tenant_id: tenantId,
          user_id: user.id,
          timezone,
          image_url: imageUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro no assistente")

      // Save thread for conversation continuity
      if (data.thread_id) setThreadId(data.thread_id)

      // Replace loading message with real response
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "...",
        timestamp: new Date(),
        toolResults: data.tool_results,
      }
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id).concat(assistantMsg))

      // ── Cache Invalidation ────────────────────────────────────────────
      if (data.tool_results?.length) {
        const tools = data.tool_results.map((t: ToolResult) => t.tool)
        if (tools.includes("extract_and_save_expense") || tools.includes("generate_expense_summary")) {
          queryClient.invalidateQueries({ queryKey: ["expenses"] })
          queryClient.invalidateQueries({ queryKey: ["financial-entries"] })
          queryClient.invalidateQueries({ queryKey: ["despesas"] })
        }
        if (tools.includes("schedule_activity")) {
          queryClient.invalidateQueries({ queryKey: ["activities"] })
        }
        if (tools.includes("schedule_outbound_message")) {
          queryClient.invalidateQueries({ queryKey: ["scheduled-communications"] })
        }
      }
    } catch (e: any) {
      setMessages(prev =>
        prev.filter(m => m.id !== loadingMsg.id).concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Erro: ${e.message}. Tente novamente.`,
          timestamp: new Date(),
        })
      )
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }, [input, attachments, tenantId, user, threadId, queryClient])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearConversation = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Conversa reiniciada. Como posso ajudar?",
      timestamp: new Date(),
    }])
    setThreadId(null)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Assistente Autonomo</h3>
            <p className="text-[10px] text-muted-foreground">Despesas, agenda, resumos, comunicacao</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearConversation} className="text-xs gap-1">
          <Trash2 className="h-3 w-3" /> Limpar
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs text-muted-foreground">Pensando...</span>
                  </div>
                ) : (
                  <>
                    {/* Attachments */}
                    {msg.attachments?.map((att, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] mb-1.5 opacity-80">
                        {att.type === "image" ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {att.name}
                      </div>
                    ))}
                    {/* Content */}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {/* Tool Result Cards */}
                    {msg.toolResults?.map((tr, i) => (
                      <ToolResultCard key={i} result={tr} />
                    ))}
                  </>
                )}
                <div className={`text-[9px] mt-1.5 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex gap-2 flex-wrap">
          {attachments.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs">
              {f.type.startsWith("image") ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-3 bg-card">
        {recording ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-lg px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Gravando {formatTime(recordingTime)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelRecording} title="Cancelar">
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleSendAudio} className="bg-primary" title="Enviar audio">
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Anexar arquivo"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={startRecording}
              disabled={sending || transcribing}
              title="Gravar audio"
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || (!input.trim() && attachments.length === 0)}
              title="Enviar"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
