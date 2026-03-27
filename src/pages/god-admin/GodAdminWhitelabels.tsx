import { useOutletContext } from "react-router-dom";
import { Plus, Search, MoreVertical, Edit, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GodAdminWhitelabels() {
  const { environment } = useOutletContext<{ environment: string }>();
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">WhiteLabels</h1>
          <p className="text-slate-400">
            Gerencie as instâncias de parceiros operando sob a própria marca.
          </p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Nova WhiteLabel
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar por nome ou slug..." 
              className="pl-10 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {environment.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">WhiteLabel</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 font-medium text-center">Nº Clientes</th>
                <th className="px-6 py-4 font-medium">MRR Gerado</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-100 flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">S</div>
                  SendHit
                </td>
                <td className="px-6 py-4 text-slate-400">sendhit</td>
                <td className="px-6 py-4 text-center"><Badge variant="secondary" className="bg-slate-800 text-slate-300">12</Badge></td>
                <td className="px-6 py-4 font-medium text-emerald-400">R$ 4.560,00</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Ativo
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-500">
                      <Shield className="h-4 w-4" />
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
