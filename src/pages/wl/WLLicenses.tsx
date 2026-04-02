import { fmtDate } from "@/lib/dateUtils";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Search, Edit, Ban, Power, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function WLLicenses() {
  const { slug } = useParams();
  const [search, setSearch] = useState("");
  const [editingLicense, setEditingLicense] = useState<any>(null);

  // Fake KPI Data
  const kpis = {
    ativas: 45,
    vencendo30d: 4,
    suspensas: 1,
    mrr_total: 12500.00
  };

  // Fake Data for Table - Only clients matching this WL
  const licenses = [
    { id: 2, account: "RadAdvogados", plan: "Profissional", mrr: 3074.00, expires: "2026-04-15", status: "ativa" },
    { id: 3, account: "Imobiliária XYZ", plan: "Solo Pro", mrr: 259.00, expires: "2026-03-22", status: "vencendo" },
    { id: 4, account: "Consultoria Global", plan: "Profissional", mrr: 1540.00, expires: "2026-03-18", status: "suspensa" },
  ];

  const statusColor = (status: string) => {
    switch(status) {
      case 'ativa': return 'bg-[var(--wl-primary)]/10 text-[var(--wl-primary)] border-[var(--wl-primary)]/20';
      case 'vencendo': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'suspensa': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Licenças de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os planos e limites contratados pelos seus clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: 'var(--wl-primary)' }}>
          <div className="flex gap-3 items-center text-muted-foreground mb-2"><CheckCircle2 className="h-4 w-4" /><span className="font-semibold text-sm">Contas Ativas</span></div>
          <span className="text-3xl font-bold">{kpis.ativas}</span>
        </Card>
        <Card className="p-4 border-l-4 border-amber-500/50">
          <div className="flex gap-3 items-center text-muted-foreground mb-2"><AlertTriangle className="h-4 w-4" /><span className="font-semibold text-sm">Venc. 30 dias</span></div>
          <span className="text-3xl font-bold">{kpis.vencendo30d}</span>
        </Card>
        <Card className="p-4 border-l-4 border-rose-500/50">
          <div className="flex gap-3 items-center text-muted-foreground mb-2"><ShieldAlert className="h-4 w-4" /><span className="font-semibold text-sm">Contas Suspensas</span></div>
          <span className="text-3xl font-bold">{kpis.suspensas}</span>
        </Card>
        <Card className="p-4 border-l-4" style={{ borderLeftColor: 'var(--wl-accent)' }}>
          <div className="flex gap-3 items-center text-muted-foreground mb-2"><FileText className="h-4 w-4" /><span className="font-semibold text-sm">MRR Gerado</span></div>
          <span className="text-3xl font-bold">R$ {(kpis.mrr_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome da conta..." 
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Conta Cliente</th>
                <th className="px-6 py-4 font-medium">Plano Atual</th>
                <th className="px-6 py-4 font-medium">Valor Mensal</th>
                <th className="px-6 py-4 font-medium">Vencimento</th>
                <th className="px-6 py-4 font-medium">Status da Licença</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(lic => (
                <tr key={lic.id} className="border-b hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 font-bold">{lic.account}</td>
                  <td className="px-6 py-4 font-medium" style={{ color: "var(--wl-primary)" }}>{lic.plan}</td>
                  <td className="px-6 py-4 font-mono">R$ {lic.mrr.toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">{fmtDate(lic.expires)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColor(lic.status)}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingLicense(lic)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" title="Suspender Serviço">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editingLicense} onOpenChange={(o) => !o && setEditingLicense(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Atualizar Licença — {editingLicense?.account}</DialogTitle>
          </DialogHeader>
          {editingLicense && (
            <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 py-4">
              <div className="space-y-4">
                <div>
                  <Label>Plano Base</Label>
                  <Select defaultValue={editingLicense.plan}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Solo Pro">Solo Pro</SelectItem><SelectItem value="Profissional">Profissional</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Aumentar Limite: Web</Label><Input type="number" defaultValue="4" className="mt-1" /></div>
                <div><Label>Aumentar Limite: Meta</Label><Input type="number" defaultValue="1" className="mt-1" /></div>
                <div><Label>Aumentar Limite: Atendentes</Label><Input type="number" defaultValue="10" className="mt-1" /></div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Pacote Facilite</Label>
                  <Select defaultValue="nenhum">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Não contratado</SelectItem>
                      <SelectItem value="basico">Gestão Básica</SelectItem>
                      <SelectItem value="inter">Intermediário</SelectItem>
                      <SelectItem value="avancado">Gestão Avançada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recurso Especial: Módulo I.A.</Label>
                  <Select defaultValue="nao">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Ativar WhatsApp I.A.</SelectItem><SelectItem value="nao">Desativado</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="pt-2 border-t">
                  <Label>Renovação da Licença</Label>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm">+ 1 Mês</Button>
                    <Button variant="outline" size="sm">+ 3 Meses</Button>
                    <Button variant="outline" size="sm">+ 12 Meses</Button>
                  </div>
                </div>
              </div>
              <div className="col-span-2 mt-2">
                <Label>Anotações do Pedido</Label>
                <Textarea placeholder="Qual o motivo da aprovação ou upgrade para os registros de auditoria..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setEditingLicense(null)}>Cancelar</Button>
            <Button style={{ backgroundColor: "var(--wl-primary)" }}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
