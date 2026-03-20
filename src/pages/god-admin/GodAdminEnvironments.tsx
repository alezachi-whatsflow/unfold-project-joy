import { useState } from "react";
import { Server, Activity, Plus, Play, AlertTriangle, ShieldCheck, Database, RefreshCcw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function GodAdminEnvironments() {
  const [isPromoting, setIsPromoting] = useState(false);

  const mockDevAccounts = [
    { id: 1, account: "Whatsflow Edtech", type: "Sandbox / Master", status: "online", lastTest: "2026-03-20 10:15" },
    { id: 2, account: "Dev QA 1", type: "Cópia", status: "paused", lastTest: "2026-03-19 18:00" },
  ];

  const handlePromoteConfig = () => {
    setIsPromoting(true);
    setTimeout(() => {
      setIsPromoting(false);
      toast.success("Configurações promovidas para a Produção! Changelog registrado.");
    }, 1500);
  };

  const handleCreateTestAccount = () => {
    toast.success("Conta de teste provisionada com sucesso (db schema clonado).");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestão de Ambientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitore a saúde dos servidores, provisione contas de homologação e aplique releases.
          </p>
        </div>
      </div>

      <Tabs defaultValue="development" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="development">Homologação (Dev)</TabsTrigger>
          <TabsTrigger value="production">Produção</TabsTrigger>
        </TabsList>

        {/* ======================= TABS CONTENT: DEVELOPMENT ======================= */}
        <TabsContent value="development" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 border-dashed border-sky-500/50 bg-sky-500/5">
              <CardHeader className="pb-3 text-sky-500">
                <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5" /> Cluster de Desenvolvimento</CardTitle>
                <CardDescription className="text-sky-500/70">As alterações nestas instâncias e contas não impactam a base oficial de Produção.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                   <div className="p-3 bg-background rounded-lg border border-white/5 relative overflow-hidden">
                     <span className="text-muted-foreground mb-1 block">Status do Banco (Pg)</span>
                     <span className="text-emerald-500 font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Operacional</span>
                   </div>
                   <div className="p-3 bg-background rounded-lg border border-white/5 relative overflow-hidden">
                     <span className="text-muted-foreground mb-1 block">Edge Functions (Local)</span>
                     <span className="text-emerald-500 font-bold flex items-center gap-2"><Activity className="h-4 w-4"/> Online (23ms)</span>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sky-500/5 border-sky-500/50 flex flex-col items-center justify-center p-6 text-center">
              <ShieldCheck className="h-8 w-8 text-sky-500 mb-2" />
              <h3 className="font-bold text-lg mb-1">Release Pronta?</h3>
              <p className="text-xs text-muted-foreground mb-4">Mova as configurações novas e rotinas validadas no Edtech direto para Produção.</p>
              <Button onClick={handlePromoteConfig} disabled={isPromoting} className="bg-sky-600 hover:bg-sky-700 w-full shadow-[0_0_15px_rgba(2,132,199,0.5)]">
                {isPromoting ? <RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Promover para Produção
              </Button>
            </Card>
          </div>

          <Card>
             <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Contas Isoladas (Sandbox)</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCreateTestAccount}><Plus className="h-4 w-4 mr-2" /> Nova Conta de Teste</Button>
             </CardHeader>
             <CardContent className="pt-0">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent">
                     <TableHead className="w-[300px]">Conta de Teste</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead>Simulação (Módulos)</TableHead>
                     <TableHead>Último Teste</TableHead>
                     <TableHead className="text-right">Ação</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {mockDevAccounts.map(acc => (
                     <TableRow key={acc.id}>
                       <TableCell className="font-bold text-sky-400">{acc.account}</TableCell>
                       <TableCell>{acc.type}</TableCell>
                       <TableCell><Badge variant="secondary" className="text-[10px]">Todos Ativos</Badge></TableCell>
                       <TableCell className="font-mono text-muted-foreground">{acc.lastTest}</TableCell>
                       <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-xs">Acessar (Impersonate)</Button></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= TABS CONTENT: PRODUCTION ======================= */}
        <TabsContent value="production" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
             <Card className="border-emerald-500/20 bg-emerald-500/5 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40">
                <CardHeader className="pb-2">
                   <CardDescription className="text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-between">
                     Uptime Principal <CheckCircle2 className="h-4 w-4" />
                   </CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-black">99.98%</CardContent>
             </Card>
             
             <Card className="border-emerald-500/20 bg-emerald-500/5 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40">
                <CardHeader className="pb-2">
                   <CardDescription className="text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-between">
                     Latência Média <Activity className="h-4 w-4" />
                   </CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-black">1.8s</CardContent>
             </Card>

             <Card className="border-emerald-500/20 bg-emerald-500/5 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40">
                <CardHeader className="pb-2">
                   <CardDescription className="text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-between">
                     Conexões (Socket) <Server className="h-4 w-4" />
                   </CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-black">4,520</CardContent>
             </Card>

             <Card className="border-rose-500/20 bg-rose-500/5 transition-all hover:bg-rose-500/10 hover:border-rose-500/40">
                <CardHeader className="pb-2">
                   <CardDescription className="text-rose-500 font-bold uppercase tracking-wider flex items-center justify-between">
                     Erros Webhook <AlertTriangle className="h-4 w-4" />
                   </CardDescription>
                </CardHeader>
                <CardContent className="flex items-baseline gap-2">
                   <span className="text-3xl font-black text-rose-500">12</span>
                   <span className="text-sm font-medium text-rose-500/50">falhas nas últ. 2h</span>
                </CardContent>
             </Card>
          </div>

          <Card>
             <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Database className="h-4 w-4" /> Relatório de Infraestrutura</CardTitle>
                <Badge className="bg-emerald-500" variant="default">SISTEMA SAUDÁVEL</Badge>
             </CardHeader>
             <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <div>
                     <p className="font-bold">Baileys WA Instances (Web)</p>
                     <p className="text-xs text-muted-foreground">Cluster Kubernetes 01</p>
                   </div>
                   <div className="flex gap-4 items-center">
                     <span className="text-xs">CPU: <span className="text-emerald-400 font-mono">32%</span></span>
                     <span className="text-xs">RAM: <span className="text-amber-400 font-mono">75%</span></span>
                   </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <div>
                     <p className="font-bold">Recebimento Oficial (Meta Webhooks)</p>
                     <p className="text-xs text-muted-foreground">Serverless Edge Functions</p>
                   </div>
                   <div className="flex gap-4 items-center">
                     <span className="text-xs">Processamento: <span className="text-emerald-400 font-mono">1.2mi req/h</span></span>
                     <span className="text-xs">Falhas: <span className="text-emerald-400 font-mono">0.05%</span></span>
                   </div>
                </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
