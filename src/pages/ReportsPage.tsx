import { useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Filter, BarChart, Activity, Phone, Tag, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ReportsPage() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState("atendimento");

  const handleExportCSV = () => {
    toast.success(`Baixando relatório de ${activeTab} em formato CSV...`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground mt-1">Extraia dados avançados sobre a operação de atendimento e vendas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[140px] bg-background">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" className="border-[var(--wl-primary)] text-[var(--wl-primary)] hover:bg-[var(--wl-primary)] hover:text-white">
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="atendimento" className="gap-2">
            <Phone className="h-4 w-4" /> Atendimento
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <DollarSign className="h-4 w-4" /> CRM / Vendas
          </TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2">
            <Tag className="h-4 w-4" /> Contatos
          </TabsTrigger>
        </TabsList>

        {/* ===== ATENDIMENTO ===== */}
        <TabsContent value="atendimento" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-secondary/20 border-white/5">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-widest text-xs font-bold text-muted-foreground">Volume de Chat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex gap-2 items-baseline">2,450 <span className="text-xs text-emerald-500 font-medium">+159 (Hj)</span></div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground"><span>Resolv: 2,100</span><span>Arq: 350</span></div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/20 border-white/5">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-widest text-xs font-bold text-muted-foreground">T. Médio Resposta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--wl-primary)]">4m 12s</div>
                <p className="text-xs text-muted-foreground mt-1">Humanos na fila principal</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/20 border-white/5">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-widest text-xs font-bold text-muted-foreground">Resolução</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">89%</div>
                <p className="text-xs text-muted-foreground mt-1">Conversas encerradas com êxito</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/20 border-white/5">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-widest text-xs font-bold text-muted-foreground">Gargalo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-500">14:00</div>
                <p className="text-xs text-muted-foreground mt-1">Horário c/ maior fila</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-widest">Heatmap: Intensidade (Hora × Dia)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 min-h-[200px]">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(dia => (
                  <div key={dia} className="flex gap-1 items-center">
                    <span className="w-8 text-xs text-muted-foreground">{dia}</span>
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex-1 h-8 rounded-sm transition-colors hover:brightness-150 cursor-pointer" style={{ backgroundColor: `rgba(16, 185, 129, ${Math.random()})` }} title={`${8 + i}:00`} />
                    ))}
                  </div>
                ))}
                <div className="flex gap-1 items-center mt-1">
                  <span className="w-8"></span>
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => <span key={h} className="flex-1 text-[10px] text-center text-muted-foreground">{h}h</span>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-widest">Ranking Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--wl-primary)]" /> Maria Alice</span>
                    <span className="text-muted-foreground font-mono">1.2k msgs (8s)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--wl-primary)]" /> João Victor</span>
                    <span className="text-muted-foreground font-mono">840 msgs (25s)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--wl-primary)] opacity-50" /> Suporte I.A.</span>
                    <span className="text-muted-foreground font-mono">4.5k msgs (&lt;1s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PIPELINE / VENDAS ===== */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <Card className="border-l-4 border-l-[var(--wl-accent)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Funil de Conversão do CRM</CardTitle>
              <CardDescription>Performance de ponta a ponta (Lead Criado até Negócio Fechado)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="font-medium text-foreground">Etapa do Pipeline</TableHead>
                    <TableHead className="font-medium text-right text-foreground">Qtd Leads</TableHead>
                    <TableHead className="font-medium text-right text-emerald-400">Conversão</TableHead>
                    <TableHead className="font-medium text-right" style={{ color: "var(--wl-accent)" }}>VGR (Potencial)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-bold">1. Captação / Oportunidade</TableCell>
                    <TableCell className="text-right">450</TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">100%</TableCell>
                    <TableCell className="text-right font-mono" style={{ color: "var(--wl-accent)" }}>R$ 450.000</TableCell>
                  </TableRow>
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-bold">2. Qualificados (Filtro)</TableCell>
                    <TableCell className="text-right">180</TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">40% drop</TableCell>
                    <TableCell className="text-right font-mono" style={{ color: "var(--wl-accent)" }}>R$ 180.000</TableCell>
                  </TableRow>
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-bold">3. Proposta Apresentada</TableCell>
                    <TableCell className="text-right">85</TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">47% conv</TableCell>
                    <TableCell className="text-right font-mono" style={{ color: "var(--wl-accent)" }}>R$ 85.000</TableCell>
                  </TableRow>
                  <TableRow className="border-white/5" style={{ backgroundColor: "color-mix(in srgb, var(--wl-primary) 10%, transparent)" }}>
                    <TableCell className="font-bold" style={{ color: "var(--wl-primary)" }}>4. Fechado (Ganhos)</TableCell>
                    <TableCell className="text-right font-bold" style={{ color: "var(--wl-primary)" }}>32</TableCell>
                    <TableCell className="text-right font-bold text-emerald-400">37% conv</TableCell>
                    <TableCell className="text-right font-mono font-bold" style={{ color: "var(--wl-primary)" }}>R$ 32.500</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Motivos de Perda (Top 5)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1"><div className="flex justify-between text-sm"><span>Achou Caro</span><span className="font-bold">45 (60%)</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[60%]" /></div></div>
                <div className="space-y-1"><div className="flex justify-between text-sm"><span>Fechou com Concorrente</span><span className="font-bold">15 (20%)</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[20%]" /></div></div>
                <div className="space-y-1"><div className="flex justify-between text-sm"><span>Sem Contato / Sumiu</span><span className="font-bold">10 (13%)</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[13%]" /></div></div>
                <div className="space-y-1"><div className="flex justify-between text-sm"><span>Prazo Incompatível</span><span className="font-bold">5 (7%)</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[7%]" /></div></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <BarChart className="h-4 w-4" /> Velocidade de Fechamento
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl font-black text-emerald-500 mb-2">14<span className="text-3xl">d</span></div>
                <p className="text-muted-foreground font-medium">Ciclo médio de vendas (Lead até Ganho).</p>
                <p className="text-xs text-muted-foreground mt-4 border border-white/10 rounded-lg p-2 bg-white/5">
                  Dica: leads contactados via WhatsApp em até 5min convertem 3x mais rápido.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== CONTATOS ===== */}
        <TabsContent value="contatos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base uppercase tracking-widest text-muted-foreground">Aquisição de Base (Origem / Tags)</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold mb-4">Volume de Entradas Diárias</h3>
                <div className="flex items-end gap-2 h-40 border-b border-white/5 pb-2">
                  {[10, 45, 30, 80, 50, 15, 60, 40, 90, 100].map((v, i) => (
                    <div key={i} className="flex-1 rounded-t opacity-70 hover:opacity-100 transition-opacity relative group cursor-pointer" style={{ height: `${v}%`, backgroundColor: "var(--wl-primary)" }}>
                      <span className="absolute -top-6 inset-x-0 mx-auto text-center opacity-0 group-hover:opacity-100 text-[10px] bg-black p-1 rounded z-10">+{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Início Mês</span><span>Hoje</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-4">Distribuição por Tags (Top 3)</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-[6px] border-[var(--wl-primary)] shrink-0" />
                    <div>
                      <p className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded bg-[var(--wl-primary)]" /> Ad_Campanha_Meta</p>
                      <p className="text-sm text-muted-foreground mt-1">1,250 contatos · <span className="font-bold" style={{ color: "var(--wl-primary)" }}>45%</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-[6px] border-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded bg-amber-500" /> Orgânico</p>
                      <p className="text-sm text-muted-foreground mt-1">840 contatos · <span className="font-bold text-amber-500">30%</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-[6px] border-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded bg-emerald-500" /> Indicação</p>
                      <p className="text-sm text-muted-foreground mt-1">300 contatos · <span className="font-bold text-emerald-500">11%</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
