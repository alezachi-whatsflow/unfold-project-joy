import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useProducts } from "@/contexts/ProductContext";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Trash2, Save, User, Briefcase, Tag, Package, CreditCard, CalendarDays, FileText, Receipt, X, CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NEGOCIO_ORIGEM_LABELS, FORMAS_PAGAMENTO, type Negocio, type NegocioProduto, type NegocioOrigem } from "@/types/vendas";

const ORIGENS: NegocioOrigem[] = ['indicacao', 'outbound', 'inbound', 'representante', 'renovacao', 'upsell', 'digital_intelligence'];
const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', '30/60/90/120 dias'];

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 pt-1">
      <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
    </div>
  );
}

export default function NegocioEditModal({ negocio, onClose }: Props) {
  const { updateNegocio } = useNegocios();
  const { products } = useProducts();
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState(negocio.titulo);
  const [clienteNome, setClienteNome] = useState(negocio.cliente_nome || "");
  const [consultorNome, setConsultorNome] = useState(negocio.consultor_nome || "");
  const [origem, setOrigem] = useState<NegocioOrigem>(negocio.origem as NegocioOrigem);
  const [tags, setTags] = useState<string[]>(negocio.tags);
  const [tagInput, setTagInput] = useState("");

  const [produtos, setProdutos] = useState<NegocioProduto[]>(negocio.produtos);
  const [descontoGeral, setDescontoGeral] = useState(negocio.desconto);
  const [descontoTipo, setDescontoTipo] = useState<'percent' | 'fixed'>(negocio.desconto_tipo as any);
  const [formaPagamento, setFormaPagamento] = useState(negocio.forma_pagamento);
  const [condicao, setCondicao] = useState(negocio.condicao_pagamento);

  const [dataFechamento, setDataFechamento] = useState(negocio.data_previsao_fechamento || "");
  const [probabilidade, setProbabilidade] = useState(negocio.probabilidade);
  const [notas, setNotas] = useState(negocio.notas || "");
  const [gerarCobranca, setGerarCobranca] = useState(negocio.gerar_cobranca);
  const [gerarNF, setGerarNF] = useState(negocio.gerar_nf);

  const activeProducts = products.filter(p => p.status === 'active');
  const subtotal = produtos.reduce((s, p) => s + p.valorTotal, 0);
  const descontoValor = descontoTipo === 'percent' ? subtotal * (descontoGeral / 100) : descontoGeral;
  const valorLiquido = Math.max(0, subtotal - descontoValor);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const probColor = probabilidade < 30 ? 'hsl(var(--destructive))' : probabilidade < 70 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)';

  const addProdutoFromCatalog = (productId: string) => {
    const prod = activeProducts.find(p => p.id === productId);
    if (!prod) return;
    setProdutos([...produtos, {
      produtoId: prod.id,
      nome: prod.name,
      quantidade: 1,
      valorUnitario: prod.price,
      desconto: 0,
      valorTotal: prod.price,
    }]);
  };

  const addProdutoManual = () => {
    setProdutos([...produtos, { produtoId: crypto.randomUUID(), nome: '', quantidade: 1, valorUnitario: 0, desconto: 0, valorTotal: 0 }]);
  };

  const updateProduto = (index: number, field: string, value: any) => {
    const updated = [...produtos];
    const p = { ...updated[index], [field]: value };
    p.valorTotal = p.quantidade * p.valorUnitario * (1 - p.desconto / 100);
    updated[index] = p;
    setProdutos(updated);
  };

  const removeProduto = (index: number) => setProdutos(produtos.filter((_, i) => i !== index));

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleSave = async () => {
    if (!titulo) { toast.error("Informe o título do negócio."); return; }
    setSaving(true);
    try {
      await updateNegocio(negocio.id, {
        titulo,
        origem,
        cliente_nome: clienteNome || null,
        consultor_nome: consultorNome || null,
        produtos,
        valor_total: subtotal,
        desconto: descontoGeral,
        desconto_tipo: descontoTipo,
        valor_liquido: valorLiquido,
        data_previsao_fechamento: dataFechamento || null,
        gerar_nf: gerarNF,
        gerar_cobranca: gerarCobranca,
        forma_pagamento: formaPagamento,
        condicao_pagamento: condicao,
        probabilidade,
        notas,
        tags,
      } as any);
      toast.success("Negócio atualizado!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader className="pb-1">
        <DialogTitle className="text-lg font-bold tracking-tight">Editar Negócio</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Atualize as informações do negócio no pipeline
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 max-h-[68vh] overflow-y-auto pr-1 -mr-1 scrollbar-thin">

        {/* ── Section: Informações Gerais ── */}
        <section className="space-y-3">
          <SectionHeader icon={Briefcase} title="Informações Gerais" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nome do negócio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} className="pl-8" placeholder="Nome do cliente" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Consultor</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={consultorNome} onChange={e => setConsultorNome(e.target.value)} className="pl-8" placeholder="Responsável" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Origem</Label>
              <Select value={origem} onValueChange={v => setOrigem(v as NegocioOrigem)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{NEGOCIO_ORIGEM_LABELS[o]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Probabilidade</Label>
              <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-background">
                <Slider value={[probabilidade]} onValueChange={v => setProbabilidade(v[0])} max={100} step={5} className="flex-1" />
                <span className="text-sm font-bold tabular-nums min-w-[40px] text-right" style={{ color: probColor }}>{probabilidade}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Tags ── */}
        <section className="space-y-3">
          <SectionHeader icon={Tag} title="Tags" />
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Digite e pressione Enter"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              className="text-sm"
            />
            <Button variant="outline" size="icon" className="shrink-0" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {tags.map(t => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="text-xs gap-1 cursor-pointer hover:bg-destructive/20 transition-colors"
                  onClick={() => setTags(tags.filter(x => x !== t))}
                >
                  {t}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* ── Section: Produtos ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader icon={Package} title="Produtos" />
            <div className="flex gap-2">
              <Select onValueChange={addProdutoFromCatalog}>
                <SelectTrigger className="h-8 w-auto text-xs gap-1 px-2.5">
                  <Package className="h-3 w-3" />
                  <SelectValue placeholder="Catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground text-xs">{fmt(p.price)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={addProdutoManual}>
                <Plus className="h-3 w-3" /> Manual
              </Button>
            </div>
          </div>

          {produtos.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_60px_90px_55px_85px_32px] gap-px bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Produto</span>
                <span className="text-center">Qtd</span>
                <span className="text-center">Unitário</span>
                <span className="text-center">Desc%</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              {/* Table rows */}
              {produtos.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_55px_85px_32px] gap-px items-center px-3 py-1.5 border-t border-border hover:bg-muted/30 transition-colors">
                  <Input value={p.nome} onChange={e => updateProduto(i, 'nome', e.target.value)} className="h-8 text-xs border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <Input type="number" value={p.quantidade} onChange={e => updateProduto(i, 'quantidade', Number(e.target.value))} className="h-8 text-xs text-center border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <Input type="number" step="any" value={p.valorUnitario} onChange={e => updateProduto(i, 'valorUnitario', Number(e.target.value))} className="h-8 text-xs text-center border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <Input type="number" value={p.desconto} onChange={e => updateProduto(i, 'desconto', Number(e.target.value))} className="h-8 text-xs text-center border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <span className="text-xs font-mono text-right text-foreground">{fmt(p.valorTotal)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProduto(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {produtos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border rounded-lg">
              <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum produto adicionado</p>
            </div>
          )}

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Desconto geral</Label>
              <div className="flex gap-2">
                <Input type="number" value={descontoGeral} onChange={e => setDescontoGeral(Number(e.target.value))} className="text-sm" />
                <Select value={descontoTipo} onValueChange={v => setDescontoTipo(v as any)}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">R$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-destructive/80">
                <span>Desconto</span>
                <span>-{fmt(descontoValor)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between text-sm font-bold text-foreground">
                <span>Líquido</span>
                <span>{fmt(valorLiquido)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Pagamento ── */}
        <section className="space-y-3">
          <SectionHeader icon={CreditCard} title="Pagamento" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condição</Label>
              <Select value={condicao} onValueChange={setCondicao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDICOES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ── Section: Fechamento ── */}
        <section className="space-y-3">
          <SectionHeader icon={CalendarDays} title="Fechamento" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data prevista</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !dataFechamento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFechamento
                    ? format(parse(dataFechamento, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                    : "dd/mm/aaaa"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFechamento ? parse(dataFechamento, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(d) => setDataFechamento(d ? format(d, "yyyy-MM-dd") : "")}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas internas</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Anotações sobre o negócio..." className="resize-none" />
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm cursor-pointer">Gerar cobrança ao fechar</Label>
              </div>
              <Switch checked={gerarCobranca} onCheckedChange={setGerarCobranca} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm cursor-pointer">Emitir NF ao fechar</Label>
              </div>
              <Switch checked={gerarNF} onCheckedChange={setGerarNF} />
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </>
  );
}
