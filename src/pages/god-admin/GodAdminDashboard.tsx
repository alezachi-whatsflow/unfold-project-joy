import { useState } from "react";
import { Users, Server, DollarSign, Activity, AlertTriangle, Building2, TrendingUp, MonitorPlay } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOutletContext } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GodAdminDashboard() {
  const { environment, setEnvironment } = useOutletContext<{ environment: string; setEnvironment: (v: any) => void }>();
  
  // Fake Global KPIs
  const globalKpis = {
    mrr: 145000,
    activeWhitelabels: 12,
    totalClients: 420,
    serverHealth: "Excelente",
  };

  // Fake WL Distribution
  const wlDistribution = [
    { id: 1, name: "Whatsflow (Diretos)", clients: 156, mrr: 45000, mom: "+12%" },
    { id: 2, name: "SendHit", clients: 84, mrr: 28000, mom: "+8%" },
    { id: 3, name: "Agência LeadUp", clients: 42, mrr: 15400, mom: "+5%" },
    { id: 4, name: "ZapLaunch Hub", clients: 18, mrr: 6500, mom: "-2%" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER E FILTRO AMBIENTE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Analytics Global</h1>
          <p className="text-muted-foreground mt-1">Visão consolidada da operação inteira do Whatsflow.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={environment === 'production' ? 'default' : 'secondary'} className="px-3 py-1 font-bold tracking-widest uppercase">
            {environment === 'production' ? 'PROD' : environment === 'development' ? 'DEV' : 'AMBOS'}
          </Badge>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Produção Oficial</span></SelectItem>
              <SelectItem value="development"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-500"></div> Sandbox / Dev</span></SelectItem>
              <SelectItem value="both"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Dados Combinados</span></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ROW 1: CORE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:border-primary/50 transition-colors bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Total Consolidado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {(globalKpis.mrr).toLocaleString('pt-BR')}</div>
            <p className="text-xs text-primary/80 mt-1 font-bold flex items-center gap-1"><TrendingUp className="h-3 w-3"/> +12.5% M/M</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-amber-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">WhiteLabels Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{globalKpis.activeWhitelabels}</div>
            <p className="text-xs text-muted-foreground mt-1">Estruturas filhas em operação</p>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-500/50 transition-colors">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes Finais</CardTitle>
             <Users className="h-4 w-4 text-blue-500" />
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-blue-500">{globalKpis.totalClients}</div>
             <p className="text-xs text-muted-foreground mt-1">Empresas rodando o sistema</p>
           </CardContent>
        </Card>

        <Card className={environment === 'production' ? "border-emerald-500/20" : "border-sky-500/20"}>
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Saúde Sistêmica</CardTitle>
             <Activity className={environment === 'production' ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-sky-500"} />
           </CardHeader>
           <CardContent>
             <div className="text-xl font-bold">Sistema OK (1.2s)</div>
             <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">2 Webhooks em atraso <AlertTriangle className="h-3 w-3 text-amber-500"/></p>
           </CardContent>
        </Card>
      </div>

      {/* ROW 2: MRR CHART & HEALTH */}
      <div className="grid lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 flex flex-col min-h-[300px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                MRR (12 Meses) por Linha de Receita
                <Badge variant="outline" className="text-[10px] bg-secondary">Add-ons vs Assinatura</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-end justify-between px-6 pt-6 pb-2 relative gap-1 border-t mt-4 border-white/5">
              {[...Array(12)].map((_, i) => {
                 const baseH = Math.random() * 40 + 20;
                 const addon1 = Math.random() * 15 + 5;
                 const addon2 = Math.random() * 10 + 2;
                 return (
                   <div key={i} className="flex-1 flex flex-col justify-end gap-[1px]">
                     <div className="bg-emerald-500 w-full rounded-t-sm transition-all hover:opacity-80 cursor-pointer" style={{ height: `${addon2}%` }} title="I.A. / Facilite"></div>
                     <div className="bg-sky-500 w-full transition-all hover:opacity-80 cursor-pointer" style={{ height: `${addon1}%` }} title="WhatsApp Extra / Atendentes"></div>
                     <div className="bg-primary w-full transition-all hover:opacity-80 cursor-pointer opacity-70" style={{ height: `${baseH}%` }} title="Plano Base"></div>
                   </div>
                 )
              })}
            </CardContent>
         </Card>

         <Card className="flex flex-col">
            <CardHeader className="border-b mb-4 pb-4">
               <CardTitle className="text-base text-muted-foreground uppercase tracking-widest"><MonitorPlay className="inline-block h-4 w-4 mr-2" /> Uso de Módulos (Global)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Dispositivos Web</span> <span className="font-bold">48%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-slate-400 w-[48%]" /></div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Dispositivos Meta API</span> <span className="font-bold">52%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[52%]" /></div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Módulo de IA Ativo</span> <span className="font-bold text-emerald-400">18%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[18%] opacity-70 border border-emerald-400 border-l lg" /></div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Gestão Facilite (Qualquer)</span> <span className="font-bold text-amber-400">8%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[8%] opacity-70" /></div>
               </div>
            </CardContent>
         </Card>
      </div>

      {/* ROW 3: WL TABLE */}
      <Card>
         <CardHeader>
           <CardTitle className="text-base uppercase tracking-widest text-muted-foreground flex items-center justify-between">
             Performance por WhiteLabel
             <Select defaultValue="revenue" >
                <SelectTrigger className="w-[180px] h-8 bg-transparent text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="revenue">Ordenar por Receita</SelectItem><SelectItem value="growth">Ordenar por Crescimento</SelectItem></SelectContent>
             </Select>
           </CardTitle>
         </CardHeader>
         <div className="overflow-x-auto">
            <Table>
               <TableHeader className="bg-secondary/50">
                  <TableRow>
                     <TableHead className="font-medium">Identificação da Franquia (WL)</TableHead>
                     <TableHead className="font-medium text-right">Contas Ativas</TableHead>
                     <TableHead className="font-medium text-right">MRR Gerado (Bruto)</TableHead>
                     <TableHead className="font-medium text-right">Cresc. MoM</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {wlDistribution.map(wl => (
                     <TableRow key={wl.id} className="hover:bg-white/5 transition-colors border-white/5">
                        <TableCell className="font-bold text-white">{wl.name}</TableCell>
                        <TableCell className="text-right">{wl.clients}</TableCell>
                        <TableCell className="text-right font-mono">R$ {wl.mrr.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className={`text-right font-bold ${wl.mom.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{wl.mom}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
      </Card>
    </div>
  );
}
