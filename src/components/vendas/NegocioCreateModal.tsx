import { useState, useEffect, useMemo } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProducts } from "@/contexts/ProductContext";
import { supabase } from "@/integrations/supabase/client";
import { DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarIcon, X, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, FORMAS_PAGAMENTO, ALL_STATUSES, type NegocioProduto, type NegocioOrigem, type NegocioStatus } from "@/types/vendas";

const ORIGENS: NegocioOrigem[] = ['indicacao', 'outbound', 'inbound', 'representante', 'renovacao', 'upsell'];
const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', '30/60/90/120 dias'];

interface Props { onClose: () => void; }

export default function NegocioCreateModal({ onClose }: Props) {
  const { createNegocio } = useNegocios();
  const { user } = useAuth();
  const { userRole } = usePermissions();
  const { products: catalogProducts } = useProducts();
  const activeProducts = catalogProducts.filter(p => p.status === 'active');
  const isRepresentante = userRole === 'representante';
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [titulo, setTitulo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [consultorNome, setConsultorNome] = useState(isRepresentante ? (user?.user_metadata?.full_name || '') : '');
  const [consultorId, setConsultorId] = useState(isRepresentante ? (user?.id || '') : '');
  const [consultorSearch, setConsultorSearch] = useState("");
  const [consultorPopoverOpen, setConsultorPopoverOpen] = useState(false);
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
  const [dataFechamento, setDataFechamento] = useState<Date | undefined>(undefined);
  const [probabilidade, setProbabilidade] = useState(50);
  const [notas, setNotas] = useState("");
  const [gerarCobranca, setGerarCobranca] = useState(true);
  const [gerarNF, setGerarNF] = useState(true);

  // CRM contacts for client autocomplete
  const [crmContacts, setCrmContacts] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    supabase.from('crm_contacts').select('id, name, company').limit(500).then(({ data }) => {
      if (data) setCrmContacts(data);
    });
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      if (data) setProfiles(data.filter((p: any) => p.full_name));
    });
  }, []);

  const filteredClients = useMemo(() => {
    if (clienteSearch.length < 2) return [];
    const q = clienteSearch.toLowerCase();
    return crmContacts.filter(c => c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)).slice(0, 8);
  }, [clienteSearch, crmContacts]);

  const filteredConsultors = useMemo(() => {
    if (consultorSearch.length < 2) return [];
    const q = consultorSearch.toLowerCase();
    return profiles.filter(p => p.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [consultorSearch, profiles]);

  const subtotal = produtos.reduce((s, p) => s + p.valorTotal, 0);
  const descontoValor = descontoTipo === 'percent' ? subtotal * (descontoGeral / 100) : descontoGeral;
  const valorLiquido = Math.max(0, subtotal - descontoValor);

  const addProduto = () => {
    setProdutos([...produtos, { produtoId: crypto.randomUUID(), nome: '', quantidade: 1, valorUnitario: 0, desconto: 0, valorTotal: 0 }]);
  };

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

  const handleSelectClient = (contact: { id: string; name: string }) => {
    setClienteNome(contact.name);
    setClienteId(contact.id);
    setClientePopoverOpen(false);
  };

  const handleCreateClient = async () => {
    if (!clienteSearch.trim()) return;
    try {
      const { data, error } = await supabase.from('crm_contacts').insert({
        name: clienteSearch.trim(),
        tenant_id: '00000000-0000-0000-0000-000000000001',
        source: 'vendas',
      }).select('id, name, company').single();
      if (error) throw error;
      setCrmContacts(prev => [...prev, data]);
      setClienteNome(data.name);
      setClienteId(data.id);
      setClientePopoverOpen(false);
      toast.success("Cliente cadastrado no CRM!");
    } catch {
      toast.error("Erro ao cadastrar cliente.");
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
        cliente_id: clienteId,
        cliente_nome: clienteNome || null,
        consultor_id: consultorId || null,
        consultor_nome: consultorNome || null,
        produtos,
        valor_total: subtotal,
        desconto: descontoGeral,
        desconto_tipo: descontoTipo,
        valor_liquido: valorLiquido,
        data_previsao_fechamento: dataFechamento ? format(dataFechamento, 'yyyy-MM-dd') : null,
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
    <TooltipProvider>
      <DialogHeader className="relative">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            Novo Negócio
            <Badge variant="outline" className="ml-2 text-xs">Passo {step}/4</Badge>
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
      </DialogHeader>

      {/* Progress */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="h-1 flex-1 rounded-full transition-colors" style={{ background: s <= step ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Descrição do negócio *</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px]">
                  <p className="text-xs">Descreva brevemente o negócio, ex: "Implantação API Oficial — Empresa X". Este campo identifica o negócio no pipeline.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Implantação Whatsflow — Empresa X" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Client autocomplete with create */}
            <div className="space-y-2">
              <Label>Cliente / Empresa</Label>
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Input
                    value={clienteNome}
                    onChange={e => {
                      setClienteNome(e.target.value);
                      setClienteSearch(e.target.value);
                      setClienteId(null);
                      if (e.target.value.length >= 2) setClientePopoverOpen(true);
                    }}
                    placeholder="Digite para buscar ou cadastrar..."
                  />
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[280px]" align="start" onOpenAutoFocus={e => e.preventDefault()}>
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." value={clienteSearch} onValueChange={setClienteSearch} />
                    <CommandList>
                      <CommandEmpty className="p-2">
                        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-primary" onClick={handleCreateClient}>
                          <Plus className="h-3 w-3" /> Cadastrar "{clienteSearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredClients.map(c => (
                          <CommandItem key={c.id} onSelect={() => handleSelectClient(c)} className="text-xs">
                            <span>{c.name}</span>
                            {c.company && <span className="ml-auto text-[10px] text-muted-foreground">{c.company}</span>}
                          </CommandItem>
                        ))}
                        {filteredClients.length > 0 && clienteSearch.length >= 2 && !filteredClients.find(c => c.name.toLowerCase() === clienteSearch.toLowerCase()) && (
                          <CommandItem onSelect={handleCreateClient} className="text-xs text-primary">
                            <Plus className="h-3 w-3 mr-1" /> Cadastrar "{clienteSearch}"
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {/* Consultant autocomplete */}
            <div className="space-y-2">
              <Label>Consultor responsável</Label>
              {isRepresentante ? (
                <Input value={consultorNome} disabled />
              ) : (
                <Popover open={consultorPopoverOpen} onOpenChange={setConsultorPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Input
                      value={consultorNome}
                      onChange={e => {
                        setConsultorNome(e.target.value);
                        setConsultorSearch(e.target.value);
                        setConsultorId('');
                        if (e.target.value.length >= 2) setConsultorPopoverOpen(true);
                      }}
                      placeholder="Digite para buscar consultor..."
                    />
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[250px]" align="start" onOpenAutoFocus={e => e.preventDefault()}>
                    <Command>
                      <CommandInput placeholder="Buscar consultor..." value={consultorSearch} onValueChange={setConsultorSearch} />
                      <CommandList>
                        <CommandEmpty><p className="text-xs text-muted-foreground p-2">Nenhum consultor encontrado</p></CommandEmpty>
                        <CommandGroup>
                          {filteredConsultors.map(p => (
                            <CommandItem key={p.id} onSelect={() => {
                              setConsultorNome(p.full_name);
                              setConsultorId(p.id);
                              setConsultorPopoverOpen(false);
                            }} className="text-xs">
                              {p.full_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex gap-2">
              <Select onValueChange={addProdutoFromCatalog}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Adicionar do catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center justify-between gap-2">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground text-[10px]">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={addProduto}><Plus className="mr-1 h-3 w-3" /> Manual</Button>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dataFechamento ? format(dataFechamento, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFechamento}
                  onSelect={setDataFechamento}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <ReviewItem label="Título" value={titulo} />
            <ReviewItem label="Cliente" value={clienteNome || '—'} />
            <ReviewItem label="Consultor" value={consultorNome || '—'} />
            <ReviewItem label="Origem" value={NEGOCIO_ORIGEM_LABELS[origem]} />
            <ReviewItem label="Status" value={NEGOCIO_STATUS_CONFIG[status].label} />
            <ReviewItem label="Probabilidade" value={`${probabilidade}%`} />
            <ReviewItem label="Valor Líquido" value={fmt(valorLiquido)} />
            <ReviewItem label="Forma Pgto" value={FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label || formaPagamento} />
            <ReviewItem label="Condição" value={condicao} />
            <ReviewItem label="Fechamento" value={dataFechamento ? format(dataFechamento, 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
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
    </TooltipProvider>
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
