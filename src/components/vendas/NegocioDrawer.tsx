import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { X, Trash2, CheckCircle, Send, Phone, Mail, CalendarDays, Radar, FileText, Loader2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateQuickReportHtml } from "@/components/intelligence/prospeccao/quickReportGenerator";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, FORMAS_PAGAMENTO, ALL_STATUSES, type Negocio, type NegocioStatus } from "@/types/vendas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NegocioEditModal from "./NegocioEditModal";

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

function getDigitalScoreFromNotas(notas: string | null): number | null {
  if (!notas) return null;
  const match = notas.match(/Score Digital:\s*(\d+)\/10/);
  return match ? parseInt(match[1]) : null;
}

function getOrigemDetalheFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Origem:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function getSiteFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Site:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function getPhoneFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Telefone:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function getNicheFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Segmento:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function getCityFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Cidade:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 5) return "#f59e0b";
  return "#f87171";
}

export default function NegocioDrawer({ negocio, onClose }: Props) {
  const { changeStatus, addHistoricoItem, deleteNegocio, updateNegocio } = useNegocios();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(negocio.titulo);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const sc = NEGOCIO_STATUS_CONFIG[negocio.status];

  const isDI = negocio.origem === "digital_intelligence";
  const diScore = isDI ? getDigitalScoreFromNotas(negocio.notas) : null;
  const origemDetalhe = isDI ? getOrigemDetalheFromNotas(negocio.notas) : null;

  const handleStatusChange = async (newStatus: string) => {
    await changeStatus(negocio, newStatus as NegocioStatus);
    toast.success(`Status alterado para ${NEGOCIO_STATUS_CONFIG[newStatus as NegocioStatus].label}`);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addHistoricoItem(negocio, { tipo: 'nota', descricao: newNote });
    setNewNote("");
    toast.success("Nota adicionada");
  };

  const handleAddActivity = async (tipo: 'ligacao' | 'email' | 'reuniao', label: string) => {
    await addHistoricoItem(negocio, { tipo, descricao: `${label} registrada` });
    toast.success(`${label} registrada`);
  };

  const handleSaveTitle = async () => {
    if (title !== negocio.titulo) {
      await updateNegocio(negocio.id, { titulo: title } as any);
      toast.success("Título atualizado");
    }
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este negócio?")) return;
    await deleteNegocio(negocio.id);
    toast.success("Negócio excluído");
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSaveTitle} onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); }} autoFocus className="text-sm font-bold" />
            ) : (
              <h2 className="text-sm font-bold text-foreground cursor-pointer hover:text-primary" onClick={() => setEditingTitle(true)}>{negocio.titulo}</h2>
            )}
            <div className="mt-2">
              <Select value={negocio.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-auto">
                  <Badge className="text-[10px]" style={{ background: `${sc.color}20`, color: sc.color, border: `1px solid ${sc.color}40` }}>
                    {sc.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: NEGOCIO_STATUS_CONFIG[s].color }} />
                        {NEGOCIO_STATUS_CONFIG[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-1">
            <PermissionGate module="vendas" action="delete">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            </PermissionGate>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Digital Intelligence Origin Banner */}
        {isDI && (
          <section className="rounded-lg p-3 border" style={{ borderColor: "#00C89640", backgroundColor: "#0D3D2E20" }}>
            <div className="flex items-center gap-2 mb-1">
              <Radar className="h-4 w-4" style={{ color: "#00C896" }} />
              <span className="text-xs font-semibold" style={{ color: "#00C896" }}>Digital Intelligence</span>
            </div>
            {origemDetalhe && (
              <p className="text-[11px] text-muted-foreground">{origemDetalhe}</p>
            )}
            {diScore !== null && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-muted-foreground">Score Digital:</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${getScoreColor(diScore)}20`, color: getScoreColor(diScore) }}>
                  {diScore}/10
                </span>
              </div>
            )}
            {/* DI Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                style={{ borderColor: "#00C896", color: "#00C896" }}
                onClick={() => {
                  const site = getSiteFromNotas(negocio.notas);
                  if (site) {
                    navigate(`/intelligence?analyze=${encodeURIComponent(site)}`);
                  } else {
                    navigate(`/intelligence?analyze=${encodeURIComponent(negocio.cliente_nome || negocio.titulo)}&type=google_maps`);
                  }
                }}
              >
                <Radar className="h-3 w-3" /> Analisar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                style={{ borderColor: "#00C896", color: "#00C896" }}
                disabled={isGeneratingReport}
                onClick={() => {
                  setIsGeneratingReport(true);
                  try {
                    const site = getSiteFromNotas(negocio.notas);
                    const phone = getPhoneFromNotas(negocio.notas);
                    const niche = getNicheFromNotas(negocio.notas) || "";
                    const city = getCityFromNotas(negocio.notas) || "";
                    const html = generateQuickReportHtml({
                      leadName: negocio.cliente_nome || negocio.titulo,
                      leadUrl: site,
                      leadPhone: phone,
                      leadDescription: null,
                      score: diScore || 0,
                      niche,
                      city,
                      hasSite: !!site,
                      hasPhone: !!phone,
                    });
                    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `relatorio-${(negocio.cliente_nome || negocio.titulo).replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Relatório HTML gerado com sucesso!");
                  } catch (err: any) {
                    toast.error("Erro ao gerar relatório");
                  } finally {
                    setIsGeneratingReport(false);
                  }
                }}
              >
                {isGeneratingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                Relatório
              </Button>
            </div>
          </section>
        )}

        {/* Financial Summary */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Resumo Financeiro</h3>
          <div className="text-2xl font-bold text-foreground mb-2">{fmt(negocio.valor_liquido)}</div>
          {negocio.produtos.length > 0 && (
            <div className="space-y-1">
              {negocio.produtos.map((p: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.nome} ({p.quantidade}x)</span>
                  <span className="font-mono text-foreground">{fmt(p.valorTotal)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Pgto: {FORMAS_PAGAMENTO.find(f => f.value === negocio.forma_pagamento)?.label || negocio.forma_pagamento}</span>
            <span>Cond: {negocio.condicao_pagamento}</span>
          </div>
        </section>

        <Separator />

        {/* Info */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Informações</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoItem label="Cliente" value={negocio.cliente_nome || '—'} />
            <InfoItem label="Consultor" value={negocio.consultor_nome || '—'} />
            <InfoItem label="Origem" value={NEGOCIO_ORIGEM_LABELS[negocio.origem] || negocio.origem} />
            <InfoItem label="Probabilidade" value={`${negocio.probabilidade}%`} />
            <InfoItem label="Fechamento previsto" value={negocio.data_previsao_fechamento ? new Date(negocio.data_previsao_fechamento).toLocaleDateString('pt-BR') : '—'} />
            <InfoItem label="Fechamento real" value={negocio.data_fechamento ? new Date(negocio.data_fechamento).toLocaleDateString('pt-BR') : '—'} />
          </div>
          {negocio.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {negocio.tags.map(t => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
            </div>
          )}
        </section>

        <Separator />

        {/* Integrations */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Integrações</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cobrança</span>
              {negocio.cobranca_id ? (
                <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> Gerada</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Não gerada</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nota Fiscal</span>
              {negocio.nf_emitida_id ? (
                <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> Emitida</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Não emitida</Badge>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* Timeline */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Histórico</h3>
          <div className="space-y-3">
            {negocio.historico.slice().reverse().map((h: any) => (
              <div key={h.id} className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-foreground">{h.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(h.data).toLocaleDateString('pt-BR')} {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {h.usuarioNome && ` — ${h.usuarioNome}`}
                  </p>
                </div>
              </div>
            ))}
            {negocio.historico.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade</p>}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('ligacao', 'Ligação')}><Phone className="mr-1 h-3 w-3" /> Ligação</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('email', 'E-mail')}><Mail className="mr-1 h-3 w-3" /> E-mail</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('reuniao', 'Reunião')}><CalendarDays className="mr-1 h-3 w-3" /> Reunião</Button>
          </div>

          {/* Add Note */}
          <div className="flex gap-2 mt-3">
            <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adicionar nota..." className="h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }} />
            <Button variant="outline" size="sm" onClick={handleAddNote}><Send className="h-3 w-3" /></Button>
          </div>
        </section>

        {/* Loss reason */}
        {negocio.status === 'fechado_perdido' && negocio.motivo_perda && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Motivo da Perda</h3>
              <p className="text-sm text-foreground">{negocio.motivo_perda}</p>
              {negocio.motivo_perda_detalhe && <p className="text-xs text-muted-foreground mt-1">{negocio.motivo_perda_detalhe}</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
