import { fmtDate } from "@/lib/dateUtils";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Edit, Ban, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function GodAdminLicenses() {
  const { environment } = useOutletContext<{ environment: string }>();
  const [search, setSearch] = useState("");
  const [editingLicense, setEditingLicense] = useState<any>(null);

  // Fake KPI Data
  const kpis = {
    ativas: 142,
    vencendo7d: 5,
    vencendo30d: 12,
    suspensas: 3,
    canceladas: 8
  };

  // Fake Data for Table
  const licenses = [
    { id: 1, account: "A3SIL TECH", type: "Direto", parent_wl: "-", plan: "Solo Pro", mrr: 259.00, expires: "2026-03-10", status: "suspensa" },
    { id: 2, account: "RadAdvogados", type: "WL Client", parent_wl: "SendHit", plan: "Profissional", mrr: 3074.00, expires: "2026-04-15", status: "ativa" },
    { id: 3, account: "Imobiliária XYZ", type: "WL Client", parent_wl: "SendHit", plan: "Solo Pro", mrr: 259.00, expires: "2026-03-22", status: "vencendo" },
  ];

  const statusColor = (status: string) => {
    switch(status) {
      case 'ativa': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'vencendo': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'suspensa': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const handleEdit = (lic: any) => {
    setEditingLicense({
      ...lic,
      devices_web: 4,
      devices_meta: 1,
      attendants: 48,
      ia_module: true,
      facilite: 'nenhum',
      reason: ''
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Gerenciamento de Licenças</h1>
          <p className="text-slate-400">
            Controle global de planos, limites e renovações ({environment}).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex gap-3 items-center text-emerald-500 mb-2"><CheckCircle2 className="h-5 w-5" /><span className="font-semibold text-sm text-slate-300">Ativas</span></div>
          <span className="text-3xl font-bold text-slate-50">{kpis.ativas}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex gap-3 items-center text-amber-500 mb-2"><AlertTriangle className="h-5 w-5" /><span className="font-semibold text-sm text-slate-300">Venc. 7d</span></div>
          <span className="text-3xl font-bold text-slate-50">{kpis.vencendo7d}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex gap-3 items-center text-amber-600 mb-2"><AlertTriangle className="h-5 w-5" /><span className="font-semibold text-sm text-slate-300">Venc. 30d</span></div>
          <span className="text-3xl font-bold text-slate-50">{kpis.vencendo30d}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex gap-3 items-center text-rose-500 mb-2"><ShieldAlert className="h-5 w-5" /><span className="font-semibold text-sm text-slate-300">Suspensas</span></div>
          <span className="text-3xl font-bold text-slate-50">{kpis.suspensas}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex gap-3 items-center text-slate-500 mb-2"><XCircle className="h-5 w-5" /><span className="font-semibold text-sm text-slate-300">Canceladas</span></div>
          <span className="text-3xl font-bold text-slate-50">{kpis.canceladas}</span>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar por conta ou whitelabel..." 
              className="pl-10 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Conta Cliente</th>
                <th className="px-6 py-4 font-medium">Tipo / Origem</th>
                <th className="px-6 py-4 font-medium">Plano / MRR</th>
                <th className="px-6 py-4 font-medium">Vencimento</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(lic => (
                <tr key={lic.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-100">{lic.account}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{lic.type}</span>
                      {lic.parent_wl !== '-' && <span className="text-xs text-slate-500">WL: {lic.parent_wl}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-emerald-400 text-xs">{lic.plan}</span>
                      <span>R$ {lic.mrr.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={new Date(lic.expires) < new Date() ? "text-rose-400 font-bold" : ""}>
                      {fmtDate(lic.expires)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColor(lic.status)}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-400" onClick={() => handleEdit(lic)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400" title="Suspender">
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" title="Cancelar Definitivamente">
                        <XCircle className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Licença — {editingLicense?.account}</DialogTitle>
          </DialogHeader>
          {editingLicense && (
            <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 py-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400">Plano Base</Label>
                  <Select defaultValue={editingLicense.plan}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Solo Pro">Solo Pro</SelectItem><SelectItem value="Profissional">Profissional</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-400">Add-on: Dispositivos Web</Label><Input type="number" defaultValue={editingLicense.devices_web} className="bg-slate-950 border-slate-800 mt-1" /></div>
                <div><Label className="text-slate-400">Add-on: Dispositivos Meta</Label><Input type="number" defaultValue={editingLicense.devices_meta} className="bg-slate-950 border-slate-800 mt-1" /></div>
                <div><Label className="text-slate-400">Add-on: Atendentes</Label><Input type="number" defaultValue={editingLicense.attendants} className="bg-slate-950 border-slate-800 mt-1" /></div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400">Facilite</Label>
                  <Select defaultValue={editingLicense.facilite}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem><SelectItem value="basico">Básico (R$ 250)</SelectItem>
                      <SelectItem value="inter">Intermediário (R$ 700)</SelectItem><SelectItem value="avancado">Avançado (R$ 1.500)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400">Módulo I.A.</Label>
                  <Select defaultValue={editingLicense.ia_module ? 'sim' : 'nao'}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Ativo (R$ 350)</SelectItem><SelectItem value="nao">Inativo</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <Label className="text-slate-400">Renovação de Validade</Label>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="bg-slate-950 border-slate-800 hover:bg-slate-800">+ 1 Mês</Button>
                    <Button variant="outline" size="sm" className="bg-slate-950 border-slate-800 hover:bg-slate-800">+ 3 Meses</Button>
                    <Button variant="outline" size="sm" className="bg-slate-950 border-slate-800 hover:bg-slate-800">+ 1 Ano</Button>
                  </div>
                </div>
              </div>
              <div className="col-span-2 mt-2">
                <Label className="text-slate-400">Motivo da Alteração (Audit Log)</Label>
                <Textarea placeholder="Ex: Upgrade solicitado via chamado #1234" className="bg-slate-950 border-slate-800 mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-slate-800 pt-4 flex items-center justify-between w-full">
            <div className="font-mono text-emerald-400 font-bold">Preview MRR: R$ <span className="text-xl">3.074,00</span></div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
