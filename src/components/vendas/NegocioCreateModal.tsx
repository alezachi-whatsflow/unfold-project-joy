import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProducts } from "@/contexts/ProductContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, FORMAS_PAGAMENTO, ALL_STATUSES, type NegocioProduto, type NegocioOrigem, type NegocioStatus } from "@/types/vendas";

const ORIGENS: NegocioOrigem[] = ['indicacao', 'outbound', 'inbound', 'representante', 'renovacao', 'upsell'];
const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', '30/60/90/120 dias'];

interface Props { onClose: () => void; }

export default function NegocioCreateModal({ onClose }: Props) {
  const { createNegocio } = useNegocios();
  const { user } = useAuth();
  const { userRole } = usePermissions();
  const isRepresentante = userRole === 'representante';
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [titulo, setTitulo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [consultorNome, setConsultorNome] = useState(isRepresentante ? (user?.user_metadata?.full_name || '') : '');
  const [consultorId, setConsultorId] = useState(isRepresentante ? (user?.id || '') : '');
  const [origem, setOrigem] = useState<NegocioOrigem>('inbound');
  const [status, setStatus] = useState<NegocioStatus>('prospeccao');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Step 2
  const [produtos, setProdutos] = useState<NegocioProduto[]>([]);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'percent' | 'fixed'>('percent');
  const [formaPagamento, setFormaPagamento] = useState('a_definir');
  const [condicao, setCondicao] = useState('À vista');

  // Step 3
  const [dataFechamento, setDataFechamento] = useState("");
  const [probabilidade, setProbabilidade] = useState(50);
  const [notas, setNotas] = useState("");
  const [gerarCobranca, setGerarCobranca] = useState(true);
  const [gerarNF, setGerarNF] = useState(true);

  const subtotal = produtos.reduce((s, p) => s + p.valorTotal, 0);
  const descontoValor = descontoTipo === 'percent' ? subtotal * (descontoGeral / 100) : descontoGeral;
  const valorLiquido = Math.max(0, subtotal - descontoValor);

  const addProduto = () => {
    setProdutos([...produtos, { produtoId: crypto.randomUUID(), nome: '', quantidade: 1, valorUnitario: 0, desconto: 0, valorTotal: 0 }]);
  };

  const updateProduto = (index: number, field: string, value: any) => {
    const updated = [...produtos];
    const p = { ...updated[index], [field]: value };
    p.valorTotal = p.quantidade * p.valorUnitario * (1 - p.desconto / 100);
    updated[index] = p;
    setProdutos(updated);
  };

  const removeProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleCreate = async () => {
    if (!titulo) { toast.error("Informe o título do negócio."); return; }
    setSaving(true);
    try {
      await createNegocio({
        titulo,
        status,
        origem,
        cliente_nome: clienteNome || null,
        consultor_id: consultorId || null,
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
      });
      toast.success("Negócio criado com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar negócio.");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const probColor = probabilidade < 30 ? '#f87171' : probabilidade < 70 ? '#f59e0b' : '#4ade80';

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Novo Negócio
          <Badge variant="outline" className="ml-auto text-xs">Passo {step}/4</Badge>
        </DialogTitle>
      </DialogHeader>

      {/* Progress */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s <= step ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título do negócio *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Implantação Whatsflow — Empresa X" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Consultor responsável</Label>
              <Input value={consultorNome} onChange={e => setConsultorNome(e.target.value)} placeholder="Nome" disabled={isRepresentante} />
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
              <Label>Status inicial</Label>
              <Select value={status} onValueChange={v => setStatus(v as NegocioStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.slice(0, 4).map(s => (
                    <SelectItem key={s} value={s}>{NEGOCIO_STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Pressione Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              <Button variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>
                    {t} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Produtos</Label>
            <Button variant="outline" size="sm" onClick={addProduto}><Plus className="mr-1 h-3 w-3" /> Adicionar</Button>
          </div>
          {produtos.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_80px_60px_80px_32px] gap-2 items-end">
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Produto</Label>}
                <Input value={p.nome} onChange={e => updateProduto(i, 'nome', e.target.value)} placeholder="Nome" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Qtd</Label>}
                <Input type="number" value={p.quantidade} onChange={e => updateProduto(i, 'quantidade', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Valor un.</Label>}
                <Input type="number" step="0.01" value={p.valorUnitario} onChange={e => updateProduto(i, 'valorUnitario', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Desc %</Label>}
                <Input type="number" value={p.desconto} onChange={e => updateProduto(i, 'desconto', Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-[10px]">Total</Label>}
                <div className="h-8 flex items-center text-xs font-mono text-foreground">{fmt(p.valorTotal)}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProduto(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
          {produtos.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto adicionado</p>}

          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desconto geral</Label>
              <div className="flex gap-2">
                <Input type="number" value={descontoGeral} onChange={e => setDescontoGeral(Number(e.target.value))} className="h-8 text-xs" />
                <Select value={descontoTipo} onValueChange={v => setDescontoTipo(v as any)}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
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
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data prevista de fechamento</Label>
            <Input type="date" value={dataFechamento} onChange={e => setDataFechamento(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Probabilidade de fechamento</Label>
              <span className="text-sm font-bold" style={{ color: probColor }}>{probabilidade}%</span>
            </div>
            <Slider value={[probabilidade]} onValueChange={v => setProbabilidade(v[0])} max={100} step={5} />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} placeholder="Observações iniciais..." />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Gerar cobrança ao fechar</Label>
            <Switch checked={gerarCobranca} onCheckedChange={setGerarCobranca} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Emitir NF ao fechar</Label>
            <Switch checked={gerarNF} onCheckedChange={setGerarNF} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Revisão do Negócio</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ReviewItem label="Título" value={titulo} />
            <ReviewItem label="Cliente" value={clienteNome || '—'} />
            <ReviewItem label="Consultor" value={consultorNome || '—'} />
            <ReviewItem label="Origem" value={NEGOCIO_ORIGEM_LABELS[origem]} />
            <ReviewItem label="Status" value={NEGOCIO_STATUS_CONFIG[status].label} />
            <ReviewItem label="Probabilidade" value={`${probabilidade}%`} />
            <ReviewItem label="Valor Líquido" value={fmt(valorLiquido)} />
            <ReviewItem label="Forma Pgto" value={FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label || formaPagamento} />
            <ReviewItem label="Condição" value={condicao} />
            <ReviewItem label="Fechamento" value={dataFechamento ? new Date(dataFechamento + 'T12:00').toLocaleDateString('pt-BR') : '—'} />
          </div>
          {produtos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Produtos ({produtos.length})</p>
              {produtos.map((p, i) => (
                <p key={i} className="text-xs text-foreground">{p.nome} — {p.quantidade}x {fmt(p.valorUnitario)} = {fmt(p.valorTotal)}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}><ChevronLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        ) : <div />}
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>Próximo <ChevronRight className="ml-1 h-4 w-4" /></Button>
        ) : (
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Criando..." : "Criar Negócio"}</Button>
        )}
      </div>
    </>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
