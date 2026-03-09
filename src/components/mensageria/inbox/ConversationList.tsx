import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Archive, CheckCheck, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "./mockInboxData";

const STATUS_TABS = [
  { key: "todas", label: "Todas" },
  { key: "nao_lidas", label: "Não lidas 🔴" },
  { key: "em_atendimento", label: "Em atendimento" },
  { key: "aguardando", label: "Aguardando" },
  { key: "finalizada", label: "Finalizadas" },
] as const;

const ORIGEM_LABELS: Record<string, { label: string; color: string }> = {
  suporte: { label: "Suporte", color: "bg-blue-500/20 text-blue-400" },
  prospeccao: { label: "Lead", color: "bg-emerald-500/20 text-emerald-400" },
  cobranca: { label: "Cobrança", color: "bg-amber-500/20 text-amber-400" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("todas");
  const [conexaoFilter, setConexaoFilter] = useState("todas");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = conversations.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.contactName.toLowerCase().includes(q) && !c.contactNumber.includes(q)) return false;
    }
    if (tab === "nao_lidas" && c.unreadCount === 0) return false;
    if (tab === "em_atendimento" && c.status !== "em_atendimento") return false;
    if (tab === "aguardando" && c.status !== "aguardando") return false;
    if (tab === "finalizada" && c.status !== "finalizada") return false;
    if (conexaoFilter !== "todas") {
      if (conexaoFilter === "suporte" && c.origem !== "suporte") return false;
      if (conexaoFilter === "cobranca" && c.origem !== "cobranca") return false;
      if (conexaoFilter === "prospeccao" && c.origem !== "prospeccao") return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversa ou número"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-2 py-1 text-xs rounded-md transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Connection filter */}
        <Select value={conexaoFilter} onValueChange={setConexaoFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Conexão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Conexão: Todas</SelectItem>
            <SelectItem value="suporte">Suporte</SelectItem>
            <SelectItem value="cobranca">Cobrança</SelectItem>
            <SelectItem value="prospeccao">Prospecção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma conversa encontrada.</div>
        )}
        {filtered.map((c) => {
          const origemInfo = ORIGEM_LABELS[c.origem];
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-border/50 transition-colors relative group",
                selectedId === c.id ? "bg-accent/60" : "hover:bg-accent/30"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                  {c.contactName.charAt(0).toUpperCase()}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    c.connectionStatus === "connected" ? "bg-emerald-500" : "bg-destructive"
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm text-foreground truncate">{c.contactName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.lastMessageTime)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {origemInfo && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", origemInfo.color)}>
                      {origemInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Unread badge */}
              {c.unreadCount > 0 && (
                <Badge className="bg-emerald-600 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center shrink-0">
                  {c.unreadCount}
                </Badge>
              )}

              {/* Hover actions */}
              {hoveredId === c.id && (
                <div className="absolute right-2 top-1 flex gap-1">
                  <button className="p-1 rounded hover:bg-muted" title="Arquivar"><Archive className="h-3 w-3 text-muted-foreground" /></button>
                  <button className="p-1 rounded hover:bg-muted" title="Marcar lida"><CheckCheck className="h-3 w-3 text-muted-foreground" /></button>
                  <button className="p-1 rounded hover:bg-muted" title="Transferir"><ArrowRightLeft className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
