import { useParams } from "react-router-dom";
import { Download, Users, MessageCircle, DollarSign, Activity, Percent, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function WLDashboard() {
  const { slug } = useParams();

  // Fake WL KPI Data
  const wlKpis = {
    mrr: 12500,
    mrrGrowth: "+8.2%",
    totalClients: 45,
    totalMessages: 84520,
    messagesGrowth: "+15%",
  };

  const topClients = [
    { id: 1, name: "RadAdvogados", msgs: 12450, engajamento: "Alto", mrr: 3074.00, trm: "45s" },
    { id: 2, name: "Consultoria Global", msgs: 9800, engajamento: "Alto", mrr: 1540.00, trm: "1m 12s" },
    { id: 3, name: "AutoEscola Pista", msgs: 4200, engajamento: "Médio", mrr: 890.00, trm: "4m 00s" },
    { id: 4, name: "Imobiliária XYZ", msgs: 3100, engajamento: "Baixo", mrr: 259.00, trm: "8m 45s" },
    { id: 5, name: "Doceria Sweet", msgs: 1500, engajamento: "Crítico", mrr: 259.00, trm: "14m 20s" },
  ];

  const handleExportCSV = () => {
    toast.success("Gerando CSV com performance e MRR dos clientes...");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Analytics Consolidado</h1>
          <p className="text-muted-foreground mt-1">
            Visão gerencial da sua franquia / white-label.
          </p>
        </div>
        <Button onClick={handleExportCSV} style={{ backgroundColor: 'var(--wl-primary)' }}>
          <Download className="h-4 w-4 mr-2" /> Exportar Relatório CSV
        </Button>
      </div>

      {/* ROW 1: KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-[var(--wl-primary)]/50 transition-colors" style={{ borderLeft: '4px solid var(--wl-primary)' }}>
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">MRR Total da Franqueada</CardTitle>
             <DollarSign className="h-4 w-4 text-[var(--wl-primary)]" />
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold">R$ {(wlKpis.mrr).toLocaleString('pt-BR')}</div>
             <p className="text-xs text-muted-foreground mt-1 font-bold flex items-center gap-1 text-[var(--wl-primary)]">
                <ArrowUp className="h-3 w-3" /> {wlKpis.mrrGrowth}
             </p>
           </CardContent>
        </Card>

        <Card className="hover:border-[var(--wl-accent)]/50 transition-colors">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
             <Users className="h-4 w-4 text-[var(--wl-accent)]" />
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold">{wlKpis.totalClients}</div>
             <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Taxa de Churn: 1.2%
             </p>
           </CardContent>
        </Card>

        <Card className="hover:border-amber-500/50 transition-colors">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Volume de Interações (Mês)</CardTitle>
             <MessageCircle className="h-4 w-4 text-amber-500" />
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold">{(wlKpis.totalMessages).toLocaleString('pt-BR')}</div>
             <p className="text-xs text-amber-500 mt-1 font-bold flex items-center gap-1 text-amber-500">
                <ArrowUp className="h-3 w-3" /> {wlKpis.messagesGrowth}
             </p>
           </CardContent>
        </Card>
      </div>

      {/* ROW 2: CHARTS */}
      <div className="grid lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 flex flex-col min-h-[300px]">
             <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground uppercase tracking-widest font-medium">Crescimento MRR (Últimos 12 Meses)</CardTitle>
             </CardHeader>
             <CardContent className="flex-1 flex items-end justify-between px-4 pt-8 pb-4 relative gap-2 mt-4">
                 {[...Array(12)].map((_, i) => {
                    // simulate growing
                    const h = 30 + (i * 5) + Math.random() * 15;
                    return (
                      <div key={i} className="flex-1 rounded-t-sm flex flex-col justify-end group cursor-pointer h-full border-b" style={{ borderBottomColor: "var(--wl-primary)" }}>
                         <div className="w-full opacity-60 group-hover:opacity-100 transition-all rounded-t-lg relative flex flex-col items-center justify-end" style={{ height: `${h}%`, backgroundColor: "var(--wl-primary)" }}>
                           <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-bold">R$ {Math.round(h * 200)}</span>
                         </div>
                      </div>
                    )
                 })}
             </CardContent>
         </Card>

         <Card className="flex flex-col">
            <CardHeader className="border-b pb-4 mb-4">
               <CardTitle className="text-base text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2"><Percent className="h-4 w-4" /> Adoção de Módulos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Dispositivos Web</span> <span className="font-bold">100%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full w-full" style={{ backgroundColor: 'var(--wl-primary)' }} /></div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Meta API</span> <span className="font-bold opacity-80">35%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full w-[35%] opacity-80" style={{ backgroundColor: 'var(--wl-primary)' }} /></div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>WhatsApp I.A.</span> <span className="font-bold opacity-60">12%</span></div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full w-[12%] opacity-60" style={{ backgroundColor: 'var(--wl-primary)' }} /></div>
               </div>
               <div className="space-y-1 items-end mt-auto pt-4 flex gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" /> <span className="text-xs text-muted-foreground">Upsell Oportunidade: <strong className="text-foreground">Meta API (+65%)</strong></span>
               </div>
            </CardContent>
         </Card>
      </div>

      {/* ROW 3: TOP CLIENTS TABLE */}
      <Card>
         <CardHeader>
           <CardTitle className="text-base uppercase tracking-widest text-muted-foreground font-medium">Top 5 Clientes (Engajamento)</CardTitle>
           <CardDescription>Critério principal: Volume de mensagens trafegadas e T.R.M.</CardDescription>
         </CardHeader>
         <div className="overflow-x-auto">
            <Table>
               <TableHeader className="bg-secondary/30">
                  <TableRow>
                     <TableHead className="font-medium">Cliente Final</TableHead>
                     <TableHead className="font-medium">Saúde Operacional</TableHead>
                     <TableHead className="font-medium text-right">Volume (Msgs)</TableHead>
                     <TableHead className="font-medium text-right">Tempo Med. Resposta</TableHead>
                     <TableHead className="font-medium text-right">Plano MRR</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {topClients.map(client => (
                     <TableRow key={client.id} className="hover:bg-white/5 transition-colors border-white/5">
                        <TableCell className="font-bold text-white">{client.name}</TableCell>
                        <TableCell>
                           <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold tracking-wider uppercase border ${client.engajamento === 'Alto' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : client.engajamento === 'Médio' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
                             {client.engajamento}
                           </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{client.msgs.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{client.trm}</TableCell>
                        <TableCell className="text-right font-mono" style={{ color: "var(--wl-primary)" }}>R$ {client.mrr.toFixed(2)}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
      </Card>

    </div>
  );
}
