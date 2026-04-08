import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useTenantId } from '@/hooks/useTenantId';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, Rocket, CheckCircle2, Building2, Plug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onComplete: () => void;
}

// ── Segments list ──
const SEGMENTS = [
  'Saúde / Clínica / Estética',
  'Imobiliário',
  'Educação / Cursos',
  'E-commerce / Loja Virtual',
  'Consultoria / Serviços',
  'Agência de Marketing',
  'Advocacia / Jurídico',
  'Contabilidade',
  'Tecnologia / SaaS',
  'Alimentação / Restaurante',
  'Fitness / Academia',
  'Automotivo',
  'Construção Civil',
  'Varejo / Loja Física',
  'Indústria / Manufatura',
  'Seguros / Financeiro',
  'Pet / Veterinário',
  'Beleza / Salão',
  'Turismo / Viagens',
  'Outro',
];

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const EMPLOYEE_RANGES = [
  'Só eu',
  '2-5 pessoas',
  '6-15 pessoas',
  '16-50 pessoas',
  '51-200 pessoas',
  '200+ pessoas',
];

// ── AI Questions (steps 2-4) ──
const QUESTIONS = [
  {
    id: 1,
    emoji: '💼',
    title: 'Qual é o coração do seu negócio?',
    subtitle: 'Nos conte em poucas palavras o que a sua empresa faz.',
    placeholder: 'Ex: Clínica de Estética focada em harmonização facial, Imobiliária de alto padrão em SP...',
  },
  {
    id: 2,
    emoji: '🎯',
    title: 'Quais informações você PRECISA saber do cliente antes de fechar a venda?',
    subtitle: 'Pense nos dados que seu time comercial coleta durante o atendimento.',
    placeholder: 'Ex: Orçamento disponível, prazo de decisão, se já é cliente de concorrente, procedimento desejado...',
  },
  {
    id: 3,
    emoji: '🗺️',
    title: 'Como é o seu passo a passo desde o primeiro "Oi" até o dinheiro na conta?',
    subtitle: 'Descreva as etapas da sua venda como se explicasse para alguém novo.',
    placeholder: 'Ex: 1) Lead chega pelo Instagram, 2) Agendamos avaliação, 3) Fazemos proposta, 4) Negociação, 5) Fechamento e pagamento...',
  },
];

// Step mapping: 0=company, 1=integrations, 2-4=questions, 5=loading, 6=success
const TOTAL_INTERACTIVE_STEPS = 5; // 0,1,2,3,4

// ── Integration channel definitions ──
interface ChannelStatus {
  key: string;
  label: string;
  channel: "whatsapp_web" | "whatsapp_meta" | "telegram" | "webchat" | "mercadolivre";
  connected: boolean;
  detail: string;
}

export default function WizardLayout({ onComplete }: Props) {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { profile, upsertProfile } = useCompanyProfile(tenantId);

  // step: 0=company, 1=integrations, 2-4=AI questions, 5=loading, 6=success
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    pipeline_name: string;
    stages: any[];
    card_schema: any[];
    departments?: Array<{ name: string; color: string; description: string }>;
    tags?: Array<{ name: string; color: string; category: string }>;
    quick_replies?: Array<{ title: string; shortcut: string; body: string }>;
    welcome_message?: string;
    away_message?: string;
    business_hours?: string;
    follow_ups?: Array<{ title: string; body: string }>;
  } | null>(null);

  // Company form state
  const [company, setCompany] = useState({
    company_name: '',
    cnpj: '',
    segment: '',
    phone: '',
    city: '',
    state: '',
    employee_count: '',
  });

  // CNPJ auto-fetch state
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjData, setCnpjData] = useState<any>(null);

  const fetchCnpjData = async (cnpj: string) => {
    setCnpjLoading(true);
    setCnpjData(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ nao encontrado");
      const data = await res.json();
      setCnpjData(data);

      // Map CNAE description to segment value
      const cnaeDesc = (data.cnae_fiscal_descricao || "").toLowerCase();
      let detectedSegment = "";
      if (cnaeDesc.includes("saude") || cnaeDesc.includes("medic") || cnaeDesc.includes("clinic") || cnaeDesc.includes("hospital")) detectedSegment = "saude";
      else if (cnaeDesc.includes("odonto") || cnaeDesc.includes("dentist")) detectedSegment = "odontologia";
      else if (cnaeDesc.includes("educacao") || cnaeDesc.includes("ensino") || cnaeDesc.includes("escola") || cnaeDesc.includes("curso")) detectedSegment = "educacao";
      else if (cnaeDesc.includes("imobili") || cnaeDesc.includes("construc") || cnaeDesc.includes("incorpora")) detectedSegment = "imoveis";
      else if (cnaeDesc.includes("tecnologia") || cnaeDesc.includes("software") || cnaeDesc.includes("informatica") || cnaeDesc.includes("sistema")) detectedSegment = "tecnologia";
      else if (cnaeDesc.includes("aliment") || cnaeDesc.includes("restaur") || cnaeDesc.includes("lanchonete")) detectedSegment = "alimentacao";
      else if (cnaeDesc.includes("advog") || cnaeDesc.includes("juridic")) detectedSegment = "juridico";
      else if (cnaeDesc.includes("contab") || cnaeDesc.includes("contad")) detectedSegment = "contabilidade";
      else if (cnaeDesc.includes("financ") || cnaeDesc.includes("banco") || cnaeDesc.includes("credito")) detectedSegment = "financeiro";
      else if (cnaeDesc.includes("comercio") || cnaeDesc.includes("varejo") || cnaeDesc.includes("loja") || cnaeDesc.includes("atacad")) detectedSegment = "varejo";
      else if (cnaeDesc.includes("moda") || cnaeDesc.includes("confeccao") || cnaeDesc.includes("vestuario")) detectedSegment = "moda";
      else if (cnaeDesc.includes("agro") || cnaeDesc.includes("pecuar") || cnaeDesc.includes("agricul")) detectedSegment = "agronegocio";
      else if (cnaeDesc.includes("beleza") || cnaeDesc.includes("estetic") || cnaeDesc.includes("cabeleir") || cnaeDesc.includes("cosmetic")) detectedSegment = "beleza";
      else if (cnaeDesc.includes("logistic") || cnaeDesc.includes("transport") || cnaeDesc.includes("frete")) detectedSegment = "logistica";
      else if (cnaeDesc.includes("market") || cnaeDesc.includes("publicidad") || cnaeDesc.includes("propaganda") || cnaeDesc.includes("agencia")) detectedSegment = "marketing";
      else if (cnaeDesc.includes("recrutam") || cnaeDesc.includes("recursos humanos")) detectedSegment = "rh";
      else if (cnaeDesc.includes("industri") || cnaeDesc.includes("fabric") || cnaeDesc.includes("manufat")) detectedSegment = "industria";

      // Auto-fill fields
      setCompany(prev => ({
        ...prev,
        company_name: prev.company_name || data.razao_social || data.nome_fantasia || "",
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
        ...(detectedSegment ? { segment: detectedSegment } : {}),
      }));

      toast.success(`CNPJ encontrado: ${data.razao_social || data.nome_fantasia}`);
    } catch (e: any) {
      toast.error("CNPJ nao encontrado na Receita Federal");
    } finally {
      setCnpjLoading(false);
    }
  };

  // Integration detection state
  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      setCompany({
        company_name: profile.company_name || '',
        cnpj: profile.cnpj || '',
        segment: profile.segment || '',
        phone: profile.phone || '',
        city: profile.city || '',
        state: profile.state || '',
        employee_count: profile.employee_count || '',
      });
    }
  }, [profile]);

  // ── Fetch integration status ──
  const fetchChannels = useCallback(async () => {
    if (!tenantId) return;
    setLoadingChannels(true);
    try {
      const result: ChannelStatus[] = [];

      // 1. WhatsApp Web (uazapi instances)
      const { data: waInstances } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_name, status')
        .eq('tenant_id', tenantId);

      const waConnected = waInstances?.some((i) => i.status === 'connected' || i.status === 'open') || false;
      result.push({
        key: 'whatsapp_web',
        label: 'WhatsApp Web',
        channel: 'whatsapp_web',
        connected: waConnected,
        detail: waConnected
          ? `${waInstances?.filter((i) => i.status === 'connected' || i.status === 'open').length} conectada(s)`
          : waInstances?.length ? 'Desconectado' : 'Não configurado',
      });

      // 2. Meta Cloud API (WABA)
      const { data: metaInt } = await supabase
        .from('channel_integrations')
        .select('id, status, name')
        .eq('tenant_id', tenantId)
        .eq('provider', 'WABA')
        .eq('status', 'active');

      result.push({
        key: 'whatsapp_meta',
        label: 'Meta Cloud API',
        channel: 'whatsapp_meta',
        connected: (metaInt?.length || 0) > 0,
        detail: metaInt?.length ? `${metaInt.length} canal(is) ativo(s)` : 'Não configurado',
      });

      // 3. Telegram
      const { data: tgInt } = await supabase
        .from('channel_integrations')
        .select('id, status, bot_username')
        .eq('tenant_id', tenantId)
        .eq('provider', 'TELEGRAM')
        .eq('status', 'active');

      result.push({
        key: 'telegram',
        label: 'Telegram',
        channel: 'telegram',
        connected: (tgInt?.length || 0) > 0,
        detail: tgInt?.length ? `@${tgInt[0].bot_username || 'bot'}` : 'Não configurado',
      });

      // 4. Webchat
      const { data: wcConfig } = await supabase
        .from('webchat_config')
        .select('id, is_enabled')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      result.push({
        key: 'webchat',
        label: 'Webchat',
        channel: 'webchat',
        connected: wcConfig?.is_enabled || false,
        detail: wcConfig?.is_enabled ? 'Ativo' : 'Não configurado',
      });

      // 5. Mercado Livre
      const { data: mlInt } = await supabase
        .from('channel_integrations')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('provider', 'MERCADOLIVRE')
        .eq('status', 'active');

      result.push({
        key: 'mercadolivre',
        label: 'Mercado Livre',
        channel: 'mercadolivre',
        connected: (mlInt?.length || 0) > 0,
        detail: mlInt?.length ? 'Conectado' : 'Não configurado',
      });

      setChannels(result);
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (step === 1) fetchChannels();
  }, [step, fetchChannels]);

  const hasAnyIntegration = channels.some((c) => c.connected);

  const canAdvanceCompany = company.company_name.trim().length >= 3 && company.segment.length > 0;

  // Questions are steps 2-4, so question index = step - 2
  const questionIndex = step - 2;
  const currentAnswer = answers[questionIndex] || '';
  const canAdvanceQuestion = currentAnswer.trim().length >= 10;
  const isLastQuestion = step === 4;

  function updateAnswer(value: string) {
    setAnswers(prev => {
      const next = [...prev];
      next[questionIndex] = value;
      return next;
    });
  }

  async function handleSaveCompany() {
    try {
      await upsertProfile({
        company_name: company.company_name,
        cnpj: company.cnpj || null,
        segment: company.segment,
        phone: company.phone || null,
        city: company.city || null,
        state: company.state || null,
        employee_count: company.employee_count || null,
        wizard_step: 1,
      } as any);
      setStep(1);
    } catch (err: any) {
      console.error('handleSaveCompany error:', err);
      toast.error(err?.message || 'Erro ao salvar dados da empresa');
    }
  }

  function handleGoToIntegracoes() {
    const basePath = slug ? `/app/${slug}` : '';
    navigate(`${basePath}/integracoes`);
  }

  async function handleGenerate() {
    setStep(5); // loading state
    setIsGenerating(true);

    try {
      const companyContext = `**Empresa:** ${company.company_name}\n**Segmento:** ${company.segment}\n**Cidade/Estado:** ${company.city || ''}/${company.state || ''}\n**Porte:** ${company.employee_count || 'Não informado'}`;

      const connectedChannels = channels.filter(c => c.connected).map(c => c.label).join(', ');
      const channelContext = connectedChannels ? `\n**Canais conectados:** ${connectedChannels}` : '';

      const combined = companyContext + channelContext + '\n\n' + QUESTIONS.map((q, i) =>
        `**${q.title}**\n${answers[i]}`
      ).join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-crm-schema', {
        body: { answers: combined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.pipeline_name || !data?.stages || !data?.card_schema) {
        throw new Error('Resposta incompleta da IA');
      }

      setResult(data);

      // Save pipeline to database (update existing default or create new)
      if (tenantId) {
        const stagesForDb = data.stages.map((s: any, i: number) => ({
          name: s.name,
          color: s.color || ['#60a5fa', '#a78bfa', '#f59e0b', '#fb923c', '#4ade80', '#ef4444'][i % 6],
          order: s.order ?? i + 1,
        }));

        // Check if a default pipeline already exists for this tenant
        const { data: existingPipeline } = await supabase
          .from('sales_pipelines')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('is_default', true)
          .eq('is_active', true)
          .maybeSingle();

        if (existingPipeline) {
          // Update existing pipeline
          await supabase
            .from('sales_pipelines')
            .update({
              name: data.pipeline_name,
              description: `Gerado por IA — ${new Date().toLocaleDateString('pt-BR')}`,
              stages: stagesForDb,
              card_schema: data.card_schema,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPipeline.id);
        } else {
          // Create new pipeline
          const { error: pipelineError } = await supabase
            .from('sales_pipelines')
            .insert({
              tenant_id: tenantId,
              name: data.pipeline_name,
              description: `Gerado por IA — ${new Date().toLocaleDateString('pt-BR')}`,
              stages: stagesForDb,
              card_schema: data.card_schema,
              is_default: true,
            });

          if (pipelineError) {
            console.error('Pipeline insert error:', pipelineError);
          }
        }

        // Departments, tags, quick replies are saved in handleFinish after user review
      }

      setStep(6); // success
    } catch (err) {
      console.error('generate-crm-schema error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar CRM');
      setStep(4); // go back to last question
    } finally {
      setIsGenerating(false);
    }
  }

  // Editable copies for review step
  const [editDepartments, setEditDepartments] = useState<Array<{ name: string; color: string; description: string }>>([]);
  const [editTags, setEditTags] = useState<Array<{ name: string; color: string; category: string }>>([]);
  const [editQuickReplies, setEditQuickReplies] = useState<Array<{ title: string; shortcut: string; body: string }>>([]);
  const [editWelcome, setEditWelcome] = useState('');
  const [editAway, setEditAway] = useState('');
  const [editHours, setEditHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Populate editable state when result arrives
  useEffect(() => {
    if (result && step === 6) {
      setEditDepartments(result.departments || []);
      setEditTags(result.tags || []);
      setEditQuickReplies(result.quick_replies || []);
      setEditWelcome(result.welcome_message || '');
      setEditAway(result.away_message || '');
      setEditHours(result.business_hours || '');
    }
  }, [result, step]);

  function handleSkipWizard() {
    if (user?.id) localStorage.setItem(`pzaafi_wizard_done_${user.id}`, "true");
    toast.success("Voce pode configurar a qualquer momento em Vendas > Configuracoes");
    onComplete();
  }

  async function handleFinish() {
    setIsSaving(true);

    // Save everything best-effort — never block completion
    if (tenantId) {
      // Departments
      for (const dept of editDepartments) {
        try { await supabase.from('departments').upsert({ tenant_id: tenantId, name: dept.name, color: dept.color || '#6366f1', description: dept.description || '' }, { onConflict: 'tenant_id,name' }); } catch {}
      }
      // Tags
      for (const tag of editTags) {
        try { await supabase.from('tenant_tags').upsert({ tenant_id: tenantId, name: tag.name, color: tag.color || '#6366f1', category: tag.category || 'general' }, { onConflict: 'tenant_id,name' }); } catch {}
      }
      // Quick replies
      if (editQuickReplies.length) {
        try { await supabase.from('quick_replies').delete().eq('tenant_id', tenantId); } catch {}
        for (const qr of editQuickReplies) {
          try { await supabase.from('quick_replies').insert({ tenant_id: tenantId, title: qr.title, shortcut: qr.shortcut, body: qr.body }); } catch {}
        }
      }
      // Profile
      try { await upsertProfile({ wizard_completed: true, wizard_step: 6 } as any); } catch (e) { console.warn('Wizard profile save:', e); }
    }

    // Always mark as done and proceed
    if (user?.id) localStorage.setItem(`pzaafi_wizard_done_${user.id}`, 'true');
    setIsSaving(false);
    toast.success('CRM personalizado ativado!');
    onComplete();
  }

  // ── Loading State (step 5) ──
  if (step === 5) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center gap-6 min-h-[400px]">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <Loader2 className="h-6 w-6 text-primary/50 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">A Inteligência Artificial está desenhando o seu CRM sob medida...</h2>
              <p className="text-sm text-muted-foreground">
                Analisando seu nicho, mapeando as etapas e criando campos personalizados.
                <br />Isso leva de 10 a 30 segundos.
              </p>
            </div>
            <div className="flex gap-1 mt-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Review & Activate (step 6) — Editable ──
  if (step === 6 && result) {
    const sectionLabel = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
    const removeBtn = "ml-auto text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors select-none";

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <h2 className="text-xl font-semibold">Revise e edite antes de ativar</h2>
                <p className="text-sm text-muted-foreground">
                  CRM "{result.pipeline_name}" — clique nos itens para editar ou remover o que não faz sentido.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline stages (read-only — core structure) */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className={sectionLabel}>Etapas do Funil</p>
            <div className="flex flex-wrap gap-2">
              {result.stages.map((s: any, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{ backgroundColor: `${s.color || '#60a5fa'}15`, borderColor: `${s.color || '#60a5fa'}40`, color: s.color || '#60a5fa' }}>
                  {s.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card schema (read-only) */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className={sectionLabel}>Campos do Card</p>
            <div className="grid grid-cols-2 gap-2">
              {result.card_schema.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50">
                  <span className="text-muted-foreground text-xs">
                    {f.type === 'text' ? '📝' : f.type === 'number' ? '#️⃣' : f.type === 'currency' ? '💰' : f.type === 'date' ? '📅' : f.type === 'select' ? '📋' : '📎'}
                  </span>
                  <span>{f.label}</span>
                  {f.required && <span className="text-[9px] text-red-400">*</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Departments — removable */}
        {editDepartments.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className={sectionLabel}>Setores</p>
              <div className="space-y-2">
                {editDepartments.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 border bg-muted/30">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color || '#6366f1' }} />
                    <Input
                      value={d.name}
                      onChange={(e) => {
                        const next = [...editDepartments];
                        next[i] = { ...next[i], name: e.target.value };
                        setEditDepartments(next);
                      }}
                      className="h-7 text-sm border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    />
                    <span className={removeBtn} onClick={() => setEditDepartments(editDepartments.filter((_, j) => j !== i))}>remover</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tags — removable */}
        {editTags.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className={sectionLabel}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {editTags.map((t, i) => (
                  <span key={i} className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border cursor-default"
                    style={{ backgroundColor: `${t.color || '#6366f1'}15`, borderColor: `${t.color || '#6366f1'}30`, color: t.color || '#6366f1' }}>
                    {t.name}
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-destructive font-bold"
                      onClick={() => setEditTags(editTags.filter((_, j) => j !== i))}
                    >×</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Replies — editable body */}
        {editQuickReplies.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className={sectionLabel}>Respostas Rápidas (editáveis)</p>
              <div className="space-y-3">
                {editQuickReplies.map((qr, i) => (
                  <div key={i} className="p-3 border bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{qr.shortcut}</code>
                      <Input
                        value={qr.title}
                        onChange={(e) => {
                          const next = [...editQuickReplies];
                          next[i] = { ...next[i], title: e.target.value };
                          setEditQuickReplies(next);
                        }}
                        className="h-7 text-sm font-medium border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 flex-1"
                      />
                      <span className={removeBtn} onClick={() => setEditQuickReplies(editQuickReplies.filter((_, j) => j !== i))}>remover</span>
                    </div>
                    <Textarea
                      value={qr.body}
                      onChange={(e) => {
                        const next = [...editQuickReplies];
                        next[i] = { ...next[i], body: e.target.value };
                        setEditQuickReplies(next);
                      }}
                      className="text-xs min-h-[60px] resize-none"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages & Hours — editable */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className={sectionLabel}>Mensagens Automáticas & Horário</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Horário de Atendimento</label>
              <Input value={editHours} onChange={(e) => setEditHours(e.target.value)} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-600">Mensagem de Boas-vindas</label>
              <Textarea value={editWelcome} onChange={(e) => setEditWelcome(e.target.value)}
                className="text-sm min-h-[60px] resize-none border-emerald-500/20 bg-emerald-500/5" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-600">Mensagem de Ausência</label>
              <Textarea value={editAway} onChange={(e) => setEditAway(e.target.value)}
                className="text-sm min-h-[60px] resize-none border-amber-500/20 bg-amber-500/5" />
            </div>
          </CardContent>
        </Card>

        {/* Activate button */}
        <Button onClick={handleFinish} className="w-full" size="lg" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
          {isSaving ? 'Salvando...' : 'Ativar e começar a vender'}
        </Button>
      </div>
    );
  }

  // ── Progress bar ──
  const progressDots = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: TOTAL_INTERACTIVE_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-emerald-500' : 'w-2 bg-muted'
          }`}
        />
      ))}
    </div>
  );

  // ── Step 0: Company Data ──
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        {progressDots}

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold leading-tight">Dados da sua empresa</h2>
              <p className="text-sm text-muted-foreground">
                Precisamos conhecer seu negócio antes de configurar a inteligência comercial.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome da empresa *
                  </label>
                  <Input
                    value={company.company_name}
                    onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                    placeholder="Ex: Clínica Renova"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CNPJ / CPF
                  </label>
                  <div className="relative">
                    <Input
                      value={company.cnpj}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
                        // Format CNPJ: 00.000.000/0000-00
                        let formatted = raw;
                        if (raw.length > 2) formatted = raw.slice(0, 2) + '.' + raw.slice(2);
                        if (raw.length > 5) formatted = formatted.slice(0, 6) + '.' + raw.slice(5);
                        if (raw.length > 8) formatted = formatted.slice(0, 10) + '/' + raw.slice(8);
                        if (raw.length > 12) formatted = formatted.slice(0, 15) + '-' + raw.slice(12);
                        setCompany({ ...company, cnpj: formatted });

                        // Auto-fetch when CNPJ is complete (14 digits)
                        if (raw.length === 14) {
                          fetchCnpjData(raw);
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                    {cnpjLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  {cnpjData && (
                    <p className="text-[10px] text-emerald-500">
                      Dados preenchidos automaticamente via CNPJ
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Segmento de atuação *
                  </label>
                  <Select value={company.segment} onValueChange={(v) => setCompany({ ...company, segment: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((s: any) => (
                        <SelectItem key={s.value || s} value={s.value || s}>{s.label || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tamanho da equipe
                  </label>
                  <Select value={company.employee_count} onValueChange={(v) => setCompany({ ...company, employee_count: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quantas pessoas?" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Telefone principal
                  </label>
                  <Input
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    placeholder="(11) 99999-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cidade
                  </label>
                  <Input
                    value={company.city}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado
                  </label>
                  <Select value={company.state} onValueChange={(v) => setCompany({ ...company, state: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES_BR.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="link" size="sm" className="text-xs text-muted-foreground hover:text-foreground px-0" onClick={handleSkipWizard}>
                Pular etapa
              </Button>
              <Button onClick={handleSaveCompany} disabled={!canAdvanceCompany}>
                Proxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 1: Integrations ──
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        {progressDots}

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <Plug className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold leading-tight">Conecte pelo menos 1 canal</h2>
              <p className="text-sm text-muted-foreground">
                Para que o CRM funcione, você precisa ter ao menos um canal de comunicação ativo.
              </p>
            </div>

            {/* Channel list */}
            {loadingChannels ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div
                    key={ch.key}
                    className="flex items-center gap-3 p-3 border"
                    style={{
                      borderColor: ch.connected ? 'rgba(17,188,118,0.4)' : 'hsl(var(--border))',
                      background: ch.connected ? 'rgba(17,188,118,0.04)' : 'transparent',
                    }}
                  >
                    <ChannelIcon channel={ch.channel} size="md" variant="icon" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ch.label}</p>
                      <p className="text-xs text-muted-foreground">{ch.detail}</p>
                    </div>
                    {ch.connected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Conectado
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoToIntegracoes}
                        className="text-xs"
                      >
                        Configurar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchChannels}
                disabled={loadingChannels}
                className="text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingChannels ? 'animate-spin' : ''}`} />
                Verificar novamente
              </Button>
            </div>

            {/* Info box when no integration */}
            {!hasAnyIntegration && !loadingChannels && (
              <div className="p-3 border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Conecte pelo menos um canal para continuar. Clique em "Configurar" acima ou vá até a página de Integrações.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button variant="link" size="sm" className="text-xs text-muted-foreground hover:text-foreground px-0" onClick={handleSkipWizard}>
                  Pular etapa
                </Button>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!hasAnyIntegration}
              >
                Proxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Steps 2-4: AI Questions ──
  const q = QUESTIONS[questionIndex];

  return (
    <div className="max-w-2xl mx-auto">
      {progressDots}

      <Card>
        <CardContent className="p-8 space-y-6">
          {/* Question header */}
          <div className="text-center space-y-2">
            <span className="text-4xl">{q.emoji}</span>
            <h2 className="text-xl font-semibold leading-tight">{q.title}</h2>
            <p className="text-sm text-muted-foreground">{q.subtitle}</p>
          </div>

          {/* Answer textarea */}
          <Textarea
            value={currentAnswer}
            onChange={e => updateAnswer(e.target.value)}
            placeholder={q.placeholder}
            className="min-h-[120px] text-sm resize-none"
            autoFocus
          />

          <p className="text-[10px] text-muted-foreground text-right">
            {currentAnswer.length < 10
              ? `Mínimo 10 caracteres (${currentAnswer.length}/10)`
              : `${currentAnswer.length} caracteres`}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button variant="link" size="sm" className="text-xs text-muted-foreground hover:text-foreground px-0" onClick={handleSkipWizard}>
                Pular etapa
              </Button>
            </div>

            {isLastQuestion ? (
              <Button
                onClick={handleGenerate}
                disabled={!canAdvanceQuestion || isGenerating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar meu CRM com IA
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvanceQuestion}
              >
                Próxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
