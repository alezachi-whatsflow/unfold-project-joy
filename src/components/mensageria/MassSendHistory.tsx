import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, CheckCircle2, XCircle, Clock, Send, Users,
  Tag, Calendar, Timer, ChevronRight, BarChart3, AlertTriangle, Loader2,
} from "lucide-react";

interface Batch {
  id: string;
  instance_name: string;
  message_type: string;
  message_body: string | null;
  include_tags: string[];
  exclude_tags: string[];
  delay_seconds: number;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
}

interface SendResult {
  id: string;
  phone: string;
  contact_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  running:   { label: "Enviando",   color: "#3b82f6", icon: Loader2 },
  completed: { label: "Concluído",  color: "#10b981", icon: CheckCircle2 },
  cancelled: { label: "Cancelado",  color: "#f59e0b", icon: AlertTriangle },
  failed:    { label: "Falhou",     color: "#ef4444", icon: XCircle },
};

interface Props {
  onBack: () => void;
}

export default function MassSendHistory({ onBack }: Props) {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["mass-send-batches", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("mass_send_batches")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Batch[];
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["mass-send-results", detailBatch?.id],
    queryFn: async () => {
      if (!detailBatch) return [];
      const { data } = await supabase
        .from("mass_send_results")
        .select("*")
        .eq("batch_id", detailBatch.id)
        .order("sent_at", { ascending: false });
      return (data || []) as SendResult[];
    },
    enabled: !!detailBatch,
  });

  const filtered = batches.filter((b) =>
    !search ||
    b.message_body?.toLowerCase().includes(search.toLowerCase()) ||
    b.include_tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
    b.instance_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSent = batches.reduce((s, b) => s + b.sent_count, 0);
  const totalFailed = batches.reduce((s, b) => s + b.failed_count, 0);
  const totalContacts = batches.reduce((s, b) => s + b.total_contacts, 0);

  const formatDate = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "em andamento";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return min > 0 ? `${min}min ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft size={14} /> Voltar</Button>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Mensagens Enviadas</h2>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            { label: "Total Envios", value: batches.length, icon: Send, color: "#6366f1" },
            { label: "Msgs Enviadas", value: totalSent, icon: CheckCircle2, color: "#10b981" },
            { label: "Falhas", value: totalFailed, icon: XCircle, color: "#ef4444" },
            { label: "Contatos Alcançados", value: totalContacts, icon: Users, color: "#3b82f6" },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <Input placeholder="Buscar por mensagem, tag ou instância..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
      </div>

      {/* Batch list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Send size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum envio em massa realizado</p>
          </div>
        ) : (
          filtered.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.completed;
            const Icon = cfg.icon;
            const successRate = b.total_contacts > 0 ? Math.round((b.sent_count / b.total_contacts) * 100) : 0;

            return (
              <Card
                key={b.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                onClick={() => setDetailBatch(b)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cfg.color}15` }}>
                    <Icon size={18} style={{ color: cfg.color }} className={b.status === "running" ? "animate-spin" : ""} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {b.message_body ? b.message_body.substring(0, 60) + (b.message_body.length > 60 ? "..." : "") : `[${b.message_type}]`}
                      </span>
                      <Badge className="text-[9px] shrink-0" style={{ background: `${cfg.color}20`, color: cfg.color }}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(b.started_at)}</span>
                      <span className="flex items-center gap-1"><Timer size={10} /> {formatDuration(b.started_at, b.completed_at)}</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {b.total_contacts}</span>
                      <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={10} /> {b.sent_count}</span>
                      {b.failed_count > 0 && <span className="flex items-center gap-1 text-red-400"><XCircle size={10} /> {b.failed_count}</span>}
                    </div>
                    {b.include_tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {b.include_tags.map((t) => (
                          <Badge key={t} className="text-[9px]" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>{t}</Badge>
                        ))}
                        {b.exclude_tags.map((t) => (
                          <Badge key={t} variant="destructive" className="text-[9px] line-through">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: successRate >= 90 ? "#10b981" : successRate >= 50 ? "#f59e0b" : "#ef4444" }}>{successRate}%</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>sucesso</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailBatch} onOpenChange={() => setDetailBatch(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 size={16} />
              Detalhes do Envio
            </DialogTitle>
          </DialogHeader>

          {detailBatch && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-xl font-bold" style={{ color: "#10b981" }}>{detailBatch.sent_count}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Enviadas</p>
                </Card>
                <Card className="p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{detailBatch.failed_count}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Falhas</p>
                </Card>
                <Card className="p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{detailBatch.delay_seconds}s</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Intervalo</p>
                </Card>
              </div>

              {/* Tags */}
              {detailBatch.include_tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Tags:</span>
                  {detailBatch.include_tags.map((t) => (
                    <Badge key={t} className="text-[10px]" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>{t}</Badge>
                  ))}
                  {detailBatch.exclude_tags.length > 0 && (
                    <>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Excluídas:</span>
                      {detailBatch.exclude_tags.map((t) => (
                        <Badge key={t} variant="destructive" className="text-[10px]">{t}</Badge>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Message preview */}
              {detailBatch.message_body && (
                <div className="rounded-lg p-3 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  {detailBatch.message_body}
                </div>
              )}

              {/* Results table */}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Detalhes por contato ({results.length})</h4>
                <div className="max-h-64 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: "var(--bg-surface)" }}>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="text-left p-2 font-medium" style={{ color: "var(--text-muted)" }}>Contato</th>
                        <th className="text-left p-2 font-medium" style={{ color: "var(--text-muted)" }}>Telefone</th>
                        <th className="text-left p-2 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                        <th className="text-left p-2 font-medium" style={{ color: "var(--text-muted)" }}>Erro</th>
                        <th className="text-right p-2 font-medium" style={{ color: "var(--text-muted)" }}>Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.id} className="border-b" style={{ borderColor: "var(--border-soft, var(--border))" }}>
                          <td className="p-2" style={{ color: "var(--text-primary)" }}>{r.contact_name || "—"}</td>
                          <td className="p-2 font-mono" style={{ color: "var(--text-secondary)" }}>{r.phone}</td>
                          <td className="p-2">
                            {r.status === "sent" ? (
                              <Badge className="text-[9px] gap-0.5" style={{ background: "#10b98120", color: "#10b981" }}><CheckCircle2 size={8} /> Enviado</Badge>
                            ) : r.status === "failed" ? (
                              <Badge className="text-[9px] gap-0.5" style={{ background: "#ef444420", color: "#ef4444" }}><XCircle size={8} /> Falhou</Badge>
                            ) : (
                              <Badge className="text-[9px]" style={{ background: "#f59e0b20", color: "#f59e0b" }}>Pendente</Badge>
                            )}
                          </td>
                          <td className="p-2 text-red-400 max-w-[150px] truncate">{r.error_message || "—"}</td>
                          <td className="p-2 text-right" style={{ color: "var(--text-muted)" }}>
                            {r.sent_at ? new Date(r.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                      {results.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>Nenhum resultado detalhado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
