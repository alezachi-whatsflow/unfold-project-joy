/**
 * MessageContextMenu — WhatsApp-style context menu on message hover/click.
 * Actions: Reply, Copy, React, Forward, Pin, Favorite, Add to Notes, Report, Delete
 */
import { useState, useRef, useEffect } from "react"
import type { Message } from "@/data/mockMessages"
import {
  Reply, Copy, SmilePlus, Forward, Pin, Star, StickyNote,
  Flag, Trash2, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

interface MessageContextMenuProps {
  message: Message
  isOutgoing: boolean
  onReply?: (msg: Message) => void
  onReact?: (msgId: string, emoji: string) => void
  onForward?: (msg: Message) => void
  onDelete?: (msgId: string) => void
  onPin?: (msgId: string) => void
  onStar?: (msgId: string) => void
  onAddToNotes?: (msg: Message) => void
}

export default function MessageContextMenu({
  message, isOutgoing, onReply, onReact, onForward, onDelete, onPin, onStar, onAddToNotes,
}: MessageContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowEmojis(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || "")
    toast.success("Mensagem copiada")
    setOpen(false)
  }

  const handleAction = (action: string, fn?: (arg: any) => void, arg?: any) => {
    fn?.(arg)
    setOpen(false)
    setShowEmojis(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger — small chevron that appears on hover */}
      <button
        onClick={() => setOpen(!open)}
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 z-10 flex items-center justify-center h-6 w-6 rounded-full"
        style={{
          [isOutgoing ? "left" : "right"]: "-8px",
          backgroundColor: "var(--wa-bg-panel)",
          border: "1px solid var(--wa-border)",
        }}
      >
        <ChevronDown size={14} style={{ color: "var(--wa-text-secondary)" }} />
      </button>

      {/* Menu dropdown */}
      {open && (
        <div
          className="absolute z-50 w-52 py-1 rounded-lg shadow-xl"
          style={{
            [isOutgoing ? "right" : "left"]: 0,
            top: "100%",
            marginTop: 4,
            backgroundColor: "var(--wa-bg-panel, hsl(var(--popover)))",
            border: "1px solid var(--wa-border, hsl(var(--border)))",
          }}
        >
          {/* Quick emoji reactions */}
          <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: "var(--wa-border, hsl(var(--border)))" }}>
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleAction("react", () => onReact?.(message.id, emoji))}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              style={{ color: "var(--wa-text-secondary)" }}
            >
              <SmilePlus size={16} />
            </button>
          </div>

          {/* Actions */}
          <MenuItem icon={Reply} label="Responder" onClick={() => handleAction("reply", () => onReply?.(message))} />
          <MenuItem icon={Copy} label="Copiar" onClick={handleCopy} />
          <MenuItem icon={SmilePlus} label="Reagir" onClick={() => setShowEmojis(!showEmojis)} />
          <MenuItem icon={Forward} label="Encaminhar" onClick={() => handleAction("forward", () => onForward?.(message))} />
          <MenuItem icon={Pin} label="Fixar" onClick={() => handleAction("pin", () => onPin?.(message.id))} />
          <MenuItem icon={Star} label="Favoritar" onClick={() => handleAction("star", () => onStar?.(message.id))} />
          <MenuItem icon={StickyNote} label="Adicionar texto as notas" onClick={() => handleAction("notes", () => onAddToNotes?.(message))} />

          <div className="my-1 border-t" style={{ borderColor: "var(--wa-border, hsl(var(--border)))" }} />

          <MenuItem icon={Flag} label="Denunciar" onClick={() => { toast.info("Mensagem denunciada"); setOpen(false) }} />
          <MenuItem icon={Trash2} label="Apagar" danger onClick={() => handleAction("delete", () => onDelete?.(message.id))} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "hover:bg-[rgba(255,255,255,0.05)]"
      }`}
      style={!danger ? { color: "var(--wa-text-primary, hsl(var(--foreground)))" } : undefined}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </button>
  )
}
