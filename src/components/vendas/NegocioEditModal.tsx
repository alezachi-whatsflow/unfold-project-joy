import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useProducts } from "@/contexts/ProductContext";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, FORMAS_PAGAMENTO, ALL_STATUSES, type Negocio, type NegocioProduto, type NegocioOrigem, type NegocioStatus } from "@/types/vendas";

const ORIGENS: NegocioOrigem[] = ['indicacao', 'outbound', 'inbound', 'representante', 'renovacao', 'upsell', 'digital_intelligence'];
const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', '30/60/90/120 dias'];

interface Props {
  negocio: Negocio;
  onClose: () => void;
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
      <DialogHeader>
        <DialogTitle>Editar Negócio</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {/* Basic Info */}
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Consultor</Label>
            <Input value={consultorNome} onChange={e => setConsultorNome(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={origem} onValueChange={v => setOrigem(v as NegocioOrigem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGENS.map(o => <SelectItem key={o} value={o}>{NEGOCIO_ORIGEM_LABELS[o]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Probabilidade</Label>
            <div className="flex items-center gap-2">
              <Slider value={[probabilidade]} onValueChange={v => setProbabilidade(v[0])} max={100} step={5} className="flex-1" />
              <span className="text-sm font-bold w-10 text-right" style={{ color: probColor }}>{probabilidade}%</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Enter para adicionar" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className="h-8 text-xs" />
            <Button variant="outline" size="sm" onClick={addTag}>+</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tags.map(t => (
                <Badge key={t} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>{t} ✕</Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Produtos</Label>
            <div className="flex gap-2">
              <Select onValueChange={addProdutoFromCatalog}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Adicionar do catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">{fmt(p.price)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addProdutoManual}><Plus className="mr-1 h-3 w-3" /> Manual</Button>
            </div>
          </div>

          {produtos.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_50px_80px_50px_80px_28px] gap-1.5 items-end">
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Produto</Label>}
                <Input value={p.nome} onChange={e => updateProduto(i, 'nome', e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Qtd</Label>}
                <Input type="number" value={p.quantidade} onChange={e => updateProduto(i, 'quantidade', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Valor un.</Label>}
                <Input type="number" step="any" value={p.valorUnitario} onChange={e => updateProduto(i, 'valorUnitario', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Desc%</Label>}
                <Input type="number" value={p.desconto} onChange={e => updateProduto(i, 'desconto', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Total</Label>}
                <div className="h-8 flex items-center text-xs font-mono text-foreground">{fmt(p.valorTotal)}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProduto(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
          {produtos.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto adicionado</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desconto geral</Label>
              <div className="flex gap-2">
                <Input type="number" value={descontoGeral} onChange={e => setDescontoGeral(Number(e.target.value))} className="h-8 text-xs" />
                <Select value={descontoTipo} onValueChange={v => setDescontoTipo(v as any)}>
                  <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">R$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs text-muted-foreground">Subtotal: {fmt(subtotal)}</p>
              <p className="text-xs text-muted-foreground">Desconto: -{fmt(descontoValor)}</p>
              <p className="text-sm font-bold text-foreground">Líquido: {fmt(valorLiquido)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment & Closing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Condição</Label>
            <Select value={condicao} onValueChange={setCondicao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDICOES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Data prevista de fechamento</Label>
          <Input type="date" value={dataFechamento} onChange={e => setDataFechamento(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
        </div>
        <div className="flex items-center justify-between py-1">
          <Label className="text-xs">Gerar cobrança ao fechar</Label>
          <Switch checked={gerarCobranca} onCheckedChange={setGerarCobranca} />
        </div>
        <div className="flex items-center justify-between py-1">
          <Label className="text-xs">Emitir NF ao fechar</Label>
          <Switch checked={gerarNF} onCheckedChange={setGerarNF} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </>
  );
}
