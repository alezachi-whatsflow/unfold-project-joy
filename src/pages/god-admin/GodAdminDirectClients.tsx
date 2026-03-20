import { useOutletContext } from "react-router-dom";
import { Plus, Search, Edit, Shield, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GodAdminDirectClients() {
  const { environment } = useOutletContext<{ environment: string }>();
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Clientes Diretos</h1>
          <p className="text-slate-400">
            Gerencie os clientes finais vinculados diretamente à Whatsflow.
          </p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente Direto
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar cliente..." 
              className="pl-10 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-amber-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Plano</th>
                <th className="px-6 py-4 font-medium">MRR</th>
                <th className="px-6 py-4 font-medium">Status / Vencimento</th>
                <th className="px-6 py-4 font-medium">Facilite</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-100 flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">A</div>
                  <div>
                    A3SIL TECH
                    <div className="text-xs font-normal text-slate-500">margarete.leme@a3sil.com.br</div>
                  </div>
                </td>
                <td className="px-6 py-4"><Badge className="bg-amber-600/20 text-amber-500 border border-amber-500/30">Solo Pro</Badge></td>
                <td className="px-6 py-4 font-medium text-emerald-400">R$ 259,00</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 w-fit rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Na Inadimplência
                    </span>
                    <span className="text-xs text-slate-500">10/03/2026</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">Nenhum</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2 h-8 text-xs font-medium">
                      <Play className="h-3 w-3 mr-1" /> Login
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
