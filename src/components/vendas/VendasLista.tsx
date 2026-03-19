import { useState, useMemo } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Download, Eye, Pencil, Trash2, Copy, Plus, CheckCircle, XCircle, Radar, Phone } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, ALL_STATUSES, NEGOCIO_ORIGEM_LABELS, type Negocio, type NegocioStatus } from "@/types/vendas";
import NegocioDrawer from "@/components/vendas/NegocioDrawer";
import NegocioCreateModal from "@/components/vendas/NegocioCreateModal";
import MotivoPerdaModal from "@/components/vendas/MotivoPerdaModal";
import FechamentoGanhoModal from "@/components/vendas/FechamentoGanhoModal";

export default function VendasLista() {
  const { negocios, isLoading, deleteNegocio, createNegocio } = useNegocios();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerNeg, setDrawerNeg] = useState<Negocio | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [perdaModal, setPerdaModal] = useState<Negocio | null>(null);
  const [ganhoModal, setGanhoModal] = useState<Negocio | null>(null);

  const [origemFilter, setOrigemFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = negocios;
    if (statusFilter !== "all") list = list.filter(n => n.status === statusFilter);
    if (origemFilter === "digital_intelligence") list = list.filter(n => n.origem === "digital_intelligence");
    else if (origemFilter === "manual") list = list.filter(n => n.origem !== "digital_intelligence");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.titulo.toLowerCase().includes(q) || (n.cliente_nome || '').toLowerCase().includes(q));
    }
    return list;
  }, [negocios, statusFilter, origemFilter, search]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function getPhone(neg: Negocio): string | null {
    if ((neg as any).phone_lead) return (neg as any).phone_lead;
    const match = (neg.notas || "").match(/Telefone:\s*(.+)/);
    return match ? match[1].trim() : null;
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const headers = ['Título', 'Cliente', 'Consultor', 'Status', 'Valor', 'Origem', 'Fechamento Previsto'];
    const rows = filtered.map(n => [
      n.titulo, n.cliente_nome || '', n.consultor_nome || '',
      NEGOCIO_STATUS_CONFIG[n.status].label, n.valor_liquido.toString(),
      NEGOCIO_ORIGEM_LABELS[n.origem] || n.origem,
      n.data_previsao_fechamento || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'negocios.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const handleDuplicate = async (neg: Negocio) => {
    await createNegocio({
      ...neg,
      titulo: `${neg.titulo} (cópia)`,
      status: 'prospeccao',
      historico: [],
      cobranca_id: null,
      nf_emitida_id: null,
      data_fechamento: null,
    });
    toast.success('Negócio duplicado');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
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
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="digital_intelligence"><span className="flex items-center gap-1.5"><Radar className="h-3 w-3" /> Digital Intelligence</span></SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <PermissionGate module="vendas" action="export">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1.5 h-4 w-4" /> CSV</Button>
        </PermissionGate>
        <PermissionGate module="vendas" action="create">
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Novo Negócio</Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum negócio encontrado</TableCell></TableRow>
                ) : filtered.map(n => {
                  const sc = NEGOCIO_STATUS_CONFIG[n.status];
                  return (
                    <TableRow key={n.id}>
                      <TableCell><Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggleSelect(n.id)} /></TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{n.titulo}</TableCell>
                      <TableCell className="max-w-[140px]">
                        <div className="text-sm text-muted-foreground truncate">{n.cliente_nome || '—'}</div>
                        {getPhone(n) && (
                          <a 
                            href={`https://wa.me/${getPhone(n)!.replace(/\D/g, '').startsWith('55') ? getPhone(n)!.replace(/\D/g, '') : '55' + getPhone(n)!.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1 mt-0.5 truncate w-max"
                            title="Abrir no WhatsApp"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            {getPhone(n)}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{n.consultor_nome || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px]" style={{ background: `${sc.color}20`, color: sc.color, border: `1px solid ${sc.color}40` }}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(n.valor_liquido)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.data_previsao_fechamento ? new Date(n.data_previsao_fechamento).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        {n.cobranca_id ? <CheckCircle className="h-4 w-4 text-primary" /> : n.gerar_cobranca ? <XCircle className="h-4 w-4 text-muted-foreground/30" /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {n.nf_emitida_id ? <CheckCircle className="h-4 w-4 text-primary" /> : n.gerar_nf ? <XCircle className="h-4 w-4 text-muted-foreground/30" /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrawerNeg(n)}><Eye className="h-3.5 w-3.5" /></Button>
                          <PermissionGate module="vendas" action="create">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(n)}><Copy className="h-3.5 w-3.5" /></Button>
                          </PermissionGate>
                          <PermissionGate module="vendas" action="delete">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteNegocio(n.id); toast.success('Negócio excluído'); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!drawerNeg} onOpenChange={o => { if (!o) setDrawerNeg(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
          {drawerNeg && <NegocioDrawer negocio={drawerNeg} onClose={() => setDrawerNeg(null)} />}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <NegocioCreateModal onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {perdaModal && <MotivoPerdaModal negocio={perdaModal} onClose={() => setPerdaModal(null)} />}
      {ganhoModal && <FechamentoGanhoModal negocio={ganhoModal} onClose={() => setGanhoModal(null)} />}
    </div>
  );
}
