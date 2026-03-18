import { useState, useEffect } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Building2 } from 'lucide-react';
import { SEGMENTS, CURRENCIES, BILLING_TYPES, CLIENT_SIZES, DECISION_MAKERS } from '@/utils/sales/icpTemplates';

interface Props { onNext: () => void; }

export default function WizardStep1({ onNext }: Props) {
  const { profile, upsertProfile } = useCompanyProfile();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('');
  const [subSegment, setSubSegment] = useState('');
  const [mainProduct, setMainProduct] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [ticketMin, setTicketMin] = useState('');
  const [ticketMax, setTicketMax] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [salesCycleDays, setSalesCycleDays] = useState('');
  const [billingType, setBillingType] = useState('');
  const [clientSize, setClientSize] = useState('');
  const [decisionMaker, setDecisionMaker] = useState('');
  const [clientPain, setClientPain] = useState('');
  const [bestClientsDesc, setBestClientsDesc] = useState('');

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setSegment(profile.segment || '');
      setSubSegment(profile.sub_segment || '');
      setMainProduct(profile.main_product || '');
      setValueProposition(profile.value_proposition || '');
      setTicketMin(profile.avg_ticket_min?.toString() || '');
      setTicketMax(profile.avg_ticket_max?.toString() || '');
      setCurrency(profile.currency || 'BRL');
      setSalesCycleDays(profile.avg_sales_cycle_days?.toString() || '');
      setBillingType(profile.billing_type || '');
      setClientSize(profile.ideal_client_size || '');
      setDecisionMaker(profile.decision_maker || '');
      setClientPain(profile.client_pain || '');
      setBestClientsDesc(profile.best_clients_desc || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!segment) { toast.error('Selecione o segmento do negócio.'); return; }
    setSaving(true);
    try {
      await upsertProfile({
        company_name: companyName,
        segment,
        sub_segment: subSegment || null,
        main_product: mainProduct || null,
        value_proposition: valueProposition || null,
        avg_ticket_min: ticketMin ? parseFloat(ticketMin) : null,
        avg_ticket_max: ticketMax ? parseFloat(ticketMax) : null,
        currency,
        avg_sales_cycle_days: salesCycleDays ? parseInt(salesCycleDays) : null,
        billing_type: billingType || null,
        ideal_client_size: clientSize || null,
        decision_maker: decisionMaker || null,
        client_pain: clientPain || null,
        best_clients_desc: bestClientsDesc || null,
      } as any);
      toast.success('Perfil salvo!');
      onNext();
    } catch {
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Sobre o seu negócio</h2>
          <p className="text-sm text-muted-foreground">Essas informações serão usadas para gerar o ICP ideal automaticamente.</p>
        </div>
      </div>

      {/* Bloco A: Identidade */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Identidade do Negócio</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Whatsflow" />
          </div>
          <div className="space-y-2">
            <Label>Segmento *</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Produto / Serviço principal</Label>
            <Input value={mainProduct} onChange={e => setMainProduct(e.target.value)} placeholder="Descreva seu produto/serviço principal" />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Proposta de valor</Label>
            <Textarea value={valueProposition} onChange={e => setValueProposition(e.target.value)} placeholder="Qual problema principal o seu produto resolve?" rows={2} />
          </div>
        </div>
      </div>

      {/* Bloco B: Números */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Números do Negócio</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ticket médio mínimo</Label>
            <Input type="number" value={ticketMin} onChange={e => setTicketMin(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Ticket médio máximo</Label>
            <Input type="number" value={ticketMax} onChange={e => setTicketMax(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ciclo médio de venda (dias)</Label>
            <Input type="number" value={salesCycleDays} onChange={e => setSalesCycleDays(e.target.value)} placeholder="Ex: 15" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de cobrança</Label>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bloco C: Perfil do cliente */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Perfil do Cliente Ideal</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Porte ideal do cliente</Label>
            <Select value={clientSize} onValueChange={setClientSize}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {CLIENT_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Decisor na negociação</Label>
            <Select value={decisionMaker} onValueChange={setDecisionMaker}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {DECISION_MAKERS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Maior dor do cliente</Label>
            <Textarea value={clientPain} onChange={e => setClientPain(e.target.value)} placeholder="Ex: Perdem clientes por demora no atendimento via WhatsApp" rows={2} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Descreva seus melhores clientes</Label>
            <Textarea value={bestClientsDesc} onChange={e => setBestClientsDesc(e.target.value)} placeholder="O que eles têm em comum?" rows={2} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Salvar e gerar ICP
        </Button>
      </div>
    </div>
  );
}
