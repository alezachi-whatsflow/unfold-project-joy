import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ExternalLink, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "./mockInboxData";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function ContactPanel({ conversation, onClose }: Props) {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>(conversation.tags);

  const copyNumber = () => {
    navigator.clipboard.writeText(conversation.contactNumber);
    toast.success("Número copiado!");
  };

  return (
    <div className="w-72 border-l border-border bg-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Info do Contato</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Avatar & name */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-foreground">
            {conversation.contactName.charAt(0)}
          </div>
          <h3 className="font-semibold text-sm">{conversation.contactName}</h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{conversation.contactNumber}</span>
            <button onClick={copyNumber} className="p-0.5 rounded hover:bg-muted">
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Tags</span>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> tag
            </button>
          </div>
        </div>

        {/* Lead info */}
        {conversation.isLead && (
          <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">Score Digital</span>
              <span className="text-lg font-bold text-emerald-400">{conversation.digitalScore || "—"}</span>
            </div>
            <Button variant="link" size="sm" className="text-emerald-400 p-0 h-auto text-xs gap-1">
              Ver no Digital Intelligence <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* CRM info */}
        {!conversation.isLead && (
          <div className="border border-blue-500/30 bg-blue-500/10 p-3 space-y-2">
            <span className="text-xs font-semibold text-blue-400">Cliente CRM</span>
            <p className="text-xs text-muted-foreground">Etapa: Ativo</p>
            <Button variant="link" size="sm" className="text-blue-400 p-0 h-auto text-xs gap-1">
              Ver no Pipeline <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* History */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Histórico</span>
          <p className="text-xs text-muted-foreground">3 conversas anteriores</p>
        </div>

        {/* CRM action */}
        {conversation.isLead && (
          <Button variant="outline" size="sm" className="w-full text-xs gap-1">
            <Plus className="h-3 w-3" /> Criar negócio no CRM
          </Button>
        )}

        {/* Internal notes */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Observações internas</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações sobre este contato..."
            className="text-xs min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
}
