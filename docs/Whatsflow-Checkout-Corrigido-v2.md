# Whatsflow — Checkout, Upsell e Ativação Automática
## Prompt Corrigido — Baseado no Estado Real do Sistema
## Plataforma: Antigravity

> **LEIA ANTES DE ENVIAR:**  
> Este prompt NÃO recria o que já existe. Ele parte do estado real atual do sistema.  
> Envie uma fase por vez. Teste antes de avançar.

---

## O que JÁ EXISTE no sistema (não recriar)

```
NEXUS ADMIN — já existe e funciona
  ✅ Painel SuperAdmin com gestão de licenças
  ✅ Tabela: Empresa | Tipo | Plano | Status | Valor |
            Dispositivos | Atendentes | I.A. | Vencimento
  ✅ Integração Asaas configurada:
       Webhook URL: https://knnwgijcrpbgqhdzmdrp.supabase.co/functions/v1/asaas-webhook
       Ambiente: Production (real) já ativo
       Botão "Registrar Webhook no Asaas" já funciona
       Botão "Sincronizar Tudo" já funciona
  ✅ Dashboard, Financeiro, Equipe, Auditoria, Feature Flags, Tickets, Configurações

WHATSFLOW FINANCE — já existe e funciona
  ✅ Painel do Tenant com todos os módulos operacionais
  ✅ Página "Assinatura & Licença" já existe com:
       Card "Plano Atual" (exibe plano + status + valor/mês)
       Card "Recursos Incluídos" (Módulo I.A. + Facilite)
       Card "Uso Atual vs Limites" (barras: Disp. Web | Disp. Meta | Atendentes)
       Botão "Falar com Whatsflow para Expandir"
  ✅ Roles: SuperAdmin, admin, gestor, financeiro, consultor, representante
```

---

## O que SERÁ CONSTRUÍDO neste prompt

```
FASE 1 — Tabelas do fluxo comercial (novas, sem alterar existentes)
FASE 2 — Conectar Asaas existente ao checkout de nova conta
FASE 3 — Adicionar upsell à página Assinatura (que já existe)
FASE 4 — Checkout pelo portal WhiteLabel
FASE 5 — Página pública de ativação de conta
```

---

---

# FASE 1 — Tabelas do Fluxo Comercial

> **Objetivo:** Criar apenas as tabelas novas que o fluxo de checkout precisa.  
> Não alterar nenhuma tabela existente.  
> **Teste:** Inserir um registro em `checkout_sessions` e verificar os índices e a função de cálculo.

---

```
O sistema já tem o Nexus Admin e o Whatsflow Finance funcionando.
A integração com o Asaas já existe — webhook registrado e ativo.
Agora crie APENAS as novas tabelas que o fluxo de checkout precisa.
Não altere nenhuma tabela ou função existente.

═══════════════════════════════════════
1. TABELA — checkout_sessions
═══════════════════════════════════════

CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  checkout_type TEXT NOT NULL,
  -- 'new_account' = novo cliente criando conta
  -- 'upsell'      = cliente existente contratando mais
  -- 'renewal'     = renovação de licença vencida

  -- Se upsell ou renewal: account que está comprando
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Se checkout gerado por WhiteLabel para seu futuro cliente
  whitelabel_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Dados do comprador (preenchidos no formulário)
  buyer_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_document TEXT,     -- CPF ou CNPJ
  company_name TEXT,
  company_slug TEXT,       -- gerado automaticamente, editável

  -- O que foi contratado (snapshot do pedido no momento da compra)
  plan TEXT NOT NULL,
  extra_devices_web INT DEFAULT 0,
  extra_devices_meta INT DEFAULT 0,
  extra_attendants INT DEFAULT 0,
  has_ai_module BOOLEAN DEFAULT false,
  facilite_plan TEXT DEFAULT 'none',
  has_implantacao_starter BOOLEAN DEFAULT false,
  billing_cycle TEXT DEFAULT 'monthly',

  -- Valores calculados e travados no momento do checkout
  monthly_value DECIMAL(10,2) NOT NULL,
  setup_fee DECIMAL(10,2) DEFAULT 0,      -- Implantação Starter
  first_charge DECIMAL(10,2) NOT NULL,    -- monthly_value + setup_fee

  -- Status
  status TEXT DEFAULT 'pending',
  -- 'pending'   = aguardando pagamento
  -- 'paid'      = pago, conta criada/atualizada
  -- 'expired'   = expirou sem pagamento (48h)
  -- 'cancelled' = cancelado manualmente

  -- Dados vindos do Asaas (preenchidos pela Edge Function)
  asaas_customer_id TEXT,
  asaas_payment_id TEXT UNIQUE,
  asaas_payment_link TEXT,
  payment_method TEXT,       -- pix | boleto | credit_card
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON checkout_sessions(status);
CREATE INDEX ON checkout_sessions(buyer_email);
CREATE INDEX ON checkout_sessions(asaas_payment_id);
CREATE INDEX ON checkout_sessions(account_id);
CREATE INDEX ON checkout_sessions(whitelabel_id);
CREATE INDEX ON checkout_sessions(checkout_type, status);

═══════════════════════════════════════
2. TABELA — activation_tokens
═══════════════════════════════════════

CREATE TABLE activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Para upsell: quem confirmou
  used_by_profile_id UUID REFERENCES profiles(id),

  status TEXT DEFAULT 'pending',
  -- 'pending' | 'used' | 'expired'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  used_at TIMESTAMPTZ
);

CREATE INDEX ON activation_tokens(token);
CREATE INDEX ON activation_tokens(status, expires_at);

═══════════════════════════════════════
3. TABELA — license_history (se não existir)
═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS license_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  changed_by_id UUID,
  changed_by_role TEXT,

  change_type TEXT,
  -- 'initial'      = criação via checkout
  -- 'upsell'       = adição de recursos via checkout
  -- 'renewal'      = renovação via checkout
  -- 'admin_edit'   = edição manual pelo Nexus ou WL Admin
  -- 'suspension' | 'reactivation' | 'cancellation'

  previous_state JSONB,   -- snapshot da license antes
  new_state JSONB,        -- snapshot da license depois
  checkout_session_id UUID REFERENCES checkout_sessions(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON license_history(account_id, created_at DESC);

═══════════════════════════════════════
4. FUNÇÃO — calculate_checkout_value
(usada no checkout para preview em tempo real)
═══════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_checkout_value(
  p_plan TEXT,
  p_extra_devices_web INT DEFAULT 0,
  p_extra_devices_meta INT DEFAULT 0,
  p_extra_attendants INT DEFAULT 0,
  p_has_ai_module BOOLEAN DEFAULT false,
  p_facilite_plan TEXT DEFAULT 'none',
  p_has_implantacao_starter BOOLEAN DEFAULT false
)
RETURNS TABLE (monthly_value DECIMAL, setup_fee DECIMAL, first_charge DECIMAL)
AS $$
DECLARE
  v_base    DECIMAL;
  v_web     DECIMAL := 0;
  v_meta    DECIMAL := 0;
  v_att     DECIMAL := 0;
  v_ai      DECIMAL := 0;
  v_fac     DECIMAL := 0;
  v_setup   DECIMAL := 0;
BEGIN
  v_base := CASE p_plan WHEN 'solo_pro' THEN 259 ELSE 359 END;

  IF p_extra_devices_web > 0 THEN
    v_web := p_extra_devices_web * CASE
      WHEN p_extra_devices_web <= 5  THEN 150
      WHEN p_extra_devices_web <= 20 THEN 125
      ELSE 100 END;
  END IF;

  IF p_extra_devices_meta > 0 THEN
    v_meta := p_extra_devices_meta * CASE
      WHEN p_extra_devices_meta <= 5  THEN 100
      WHEN p_extra_devices_meta <= 20 THEN 80
      ELSE 60 END;
  END IF;

  IF p_extra_attendants > 0 THEN
    v_att := p_extra_attendants * CASE
      WHEN p_extra_attendants <= 5  THEN 80
      WHEN p_extra_attendants <= 10 THEN 75
      WHEN p_extra_attendants <= 20 THEN 70
      ELSE 60 END;
  END IF;

  IF p_has_ai_module   THEN v_ai    := 350; END IF;
  IF p_has_implantacao_starter THEN v_setup := 2000; END IF;

  v_fac := CASE p_facilite_plan
    WHEN 'basico'        THEN 250
    WHEN 'intermediario' THEN 700
    WHEN 'avancado'      THEN 1500
    ELSE 0 END;

  RETURN QUERY SELECT
    (v_base + v_web + v_meta + v_att + v_ai + v_fac)::DECIMAL,
    v_setup::DECIMAL,
    (v_base + v_web + v_meta + v_att + v_ai + v_fac + v_setup)::DECIMAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

═══════════════════════════════════════
TESTES FASE 1
═══════════════════════════════════════

-- Teste 1: plano profissional simples com implantação
SELECT * FROM calculate_checkout_value('profissional',0,0,0,false,'none',true);
-- Esperado: monthly=359, setup=2000, first_charge=2359

-- Teste 2: plano profissional com 5 web + I.A. + facilite básico
SELECT * FROM calculate_checkout_value('profissional',5,0,0,true,'basico',false);
-- web=750, ai=350, fac=250 → monthly=1709, setup=0, first_charge=1709

-- Teste 3: inserir checkout_session com status='pending'
-- Verificar índices criados corretamente
```

---

---

# FASE 2 — Conectar o Asaas Existente ao Checkout de Nova Conta

> **IMPORTANTE:** A integração com o Asaas JÁ EXISTE.  
> O webhook `https://knnwgijcrpbgqhdzmdrp.supabase.co/functions/v1/asaas-webhook` já está registrado e recebendo eventos.  
> Esta fase EXPANDE a Edge Function existente para tratar o evento de checkout de nova conta.  
> Não recrie a integração — apenas adicione a lógica nova.  
> **Teste:** Simular webhook de pagamento confirmado e verificar que a conta é criada automaticamente.

---

```
A Edge Function asaas-webhook já existe e está funcionando para cobranças do Finance.
Agora EXPANDA ela para também tratar pagamentos originados de checkout_sessions.

NÃO recrie a função. Adicione apenas o bloco condicional novo dentro da lógica existente.

═══════════════════════════════════════
EXPANSÃO DA EDGE FUNCTION — asaas-webhook
═══════════════════════════════════════

No handler existente do evento PAYMENT_CONFIRMED / PAYMENT_RECEIVED,
adicionar ANTES de qualquer processamento existente:

  // 1. Verificar se este pagamento pertence a um checkout_session
  const checkoutSession = await supabase
    .from('checkout_sessions')
    .select('*')
    .eq('asaas_payment_id', paymentId)
    .single();

  // 2. Se pertence a um checkout_session: tratar aqui e retornar
  if (checkoutSession.data) {
    await handleCheckoutPayment(checkoutSession.data, supabase);
    return new Response('OK', { status: 200 });
  }

  // 3. Se NÃO pertence: continuar fluxo existente normalmente
  // ... lógica existente do Finance continua aqui ...

═══════════════════════════════════════
NOVA FUNÇÃO — handleCheckoutPayment
═══════════════════════════════════════

Criar função auxiliar handleCheckoutPayment(session, supabase):

IDEMPOTÊNCIA — verificar primeiro:
  Se session.status !== 'pending': return (já processado)

ATUALIZAR checkout_session:
  status = 'paid'
  paid_at = NOW()

RAMIFICAR pelo checkout_type:

─────────────────────────
SE checkout_type = 'new_account':
─────────────────────────

  PASSO A — Criar account:
    INSERT INTO accounts:
      name = session.company_name
      slug = session.company_slug
      account_type = session.whitelabel_id ? 'wl_client' : 'direct_client'
      whitelabel_id = session.whitelabel_id (pode ser NULL)
      parent_id = session.whitelabel_id (pode ser NULL)
      status = 'active'
      plan = session.plan
      environment = 'production'

  PASSO B — Criar license:
    INSERT INTO licenses:
      account_id = nova account.id
      plan = session.plan
      base_devices_web = 1
      base_devices_meta = 1    -- bônus automático
      base_attendants = session.plan === 'solo_pro' ? 1 : 3
      extra_devices_web = session.extra_devices_web
      extra_devices_meta = session.extra_devices_meta
      extra_attendants = session.extra_attendants
      has_ai_module = session.has_ai_module
      ai_agents_limit = session.has_ai_module ? 5 : 0
      facilite_plan = session.facilite_plan
      facilite_monthly_hours = mapeado conforme plano (none=0, basico=8, intermediario=20, avancado=40)
      monthly_value = session.monthly_value
      billing_cycle = session.billing_cycle
      valid_until = NOW() + INTERVAL '1 month'

  PASSO C — Criar profile do admin (via Supabase Auth invite):
    Enviar magic link / invite para session.buyer_email
    Após aceite, o profile será vinculado ao account_id criado

  PASSO D — Criar activation_token:
    INSERT INTO activation_tokens:
      checkout_session_id = session.id
      account_id = nova account.id
    Retornar o token gerado

  PASSO E — Enviar email de ativação:
    Se session.whitelabel_id:
      Buscar whitelabel_branding da WL
      Email com: logo da WL, app_name da WL, cores da WL
      Remetente: support_email da WL (se configurado)
    Senão:
      Email com branding Whatsflow padrão

    Corpo do email:
      "Olá {buyer_name}, sua conta {company_name} foi criada!
       Clique no link abaixo para definir sua senha e acessar o sistema.
       Link válido por 24 horas.
       {URL_BASE}/ativar/{token}"

    Enviar via Resend (ou provedor já configurado no projeto)

  PASSO F — Registrar em license_history:
    INSERT INTO license_history:
      account_id = nova account.id
      changed_by_role = 'system'
      change_type = 'initial'
      new_state = snapshot da license criada
      checkout_session_id = session.id
      reason = 'Conta criada via checkout automático'

─────────────────────────
SE checkout_type = 'upsell':
─────────────────────────

  Buscar license existente da session.account_id

  Salvar previous_state = snapshot atual da license

  Atualizar license com os novos recursos:
    extra_devices_web += session.extra_devices_web
    extra_devices_meta += session.extra_devices_meta
    extra_attendants += session.extra_attendants
    Se session.has_ai_module = true: has_ai_module = true, ai_agents_limit = 5
    Se session.facilite_plan != 'none': facilite_plan = session.facilite_plan
    Recalcular monthly_value via calculate_checkout_value

  Registrar em license_history:
    change_type = 'upsell'
    previous_state = snapshot anterior
    new_state = snapshot após atualização
    checkout_session_id = session.id

  Enviar email de confirmação:
    "Seus novos recursos foram ativados com sucesso!"

─────────────────────────
SE checkout_type = 'renewal':
─────────────────────────

  Atualizar license.valid_until:
    Se billing_cycle = 'monthly': valid_until += 1 mês
    Se billing_cycle = 'annual': valid_until += 12 meses

  Se account.status = 'suspended': account.status = 'active'

  Registrar em license_history:
    change_type = 'renewal'

  Enviar email de confirmação de renovação

═══════════════════════════════════════
TESTES FASE 2
═══════════════════════════════════════

Teste 1 — Idempotência:
  Processar o mesmo asaas_payment_id duas vezes
  Verificar que a segunda execução não cria dados duplicados

Teste 2 — new_account:
  Inserir checkout_session manualmente com status='pending', checkout_type='new_account'
  Simular webhook via curl:
    curl -X POST {webhook_url} -H "Content-Type: application/json" \
    -d '{"event":"PAYMENT_CONFIRMED","payment":{"id":"{asaas_payment_id}"}}'
  Verificar: account criada, license criada, activation_token gerado, email enviado

Teste 3 — upsell:
  Inserir checkout_session com checkout_type='upsell', account_id de conta existente
  Simular webhook
  Verificar: license atualizada corretamente, license_history registrado

Teste 4 — Fluxo existente intacto:
  Simular webhook de cobrança normal do Finance (sem asaas_payment_id em checkout_sessions)
  Verificar que o fluxo existente continua funcionando normalmente
```

---

---

# FASE 3 — Expandir a Página "Assinatura & Licença" com Upsell

> **IMPORTANTE:** A página "Assinatura & Licença" JÁ EXISTE com:  
> - Card "Plano Atual" (plano + status + valor)  
> - Card "Recursos Incluídos" (I.A. + Facilite)  
> - Card "Uso Atual vs Limites" (barras de progresso)  
> - Botão "Falar com Whatsflow para Expandir"  
>
> Esta fase adiciona ABAIXO do conteúdo existente a seção de upsell com checkout integrado.  
> Não altere, mova ou recrie nada que já existe na página.  
> **Teste:** Cliente contrata Módulo I.A. via upsell → PIX gerado → pago → page atualiza automaticamente.

---

```
A página Assinatura & Licença já existe no painel Finance.
Não altere nada do que já está implementado nela.
Adicione ABAIXO do conteúdo existente duas novas seções.

═══════════════════════════════════════
SEÇÃO NOVA 1 — "Expanda seu plano"
(adicionar após o card Uso Atual vs Limites)
═══════════════════════════════════════

Título: "Expanda seu plano"
Subtítulo: "Contrate novos recursos diretamente aqui, sem precisar entrar em contato."

Renderizar um card de upsell para CADA recurso disponível para contratação.
Lógica de exibição por card:

  CARD "Mais Dispositivos Web WhatsApp"
    Mostrar SEMPRE (sempre é possível adicionar mais)
    Corpo: "Conecte mais números WhatsApp à sua operação"
    Detalhe do tier atual baseado no total já contratado:
      ≤5 total → "R$ 150,00/un (Tier 1: 1–5 dispositivos)"
      ≤20 total → "R$ 125,00/un (Tier 2: 6–20 dispositivos)"
      >20 total → "R$ 100,00/un (Tier 3: 21–50 dispositivos)"
    Input: [ − ] {qty} [ + ]  (mínimo 1)
    Preview preço: "R$ {qty × unit_price}/mês"
    Botão: [Contratar]

  CARD "Mais Dispositivos Meta Business Manager"
    Mostrar SEMPRE
    Mesmo padrão de tiers e input
    Tiers Meta: ≤5=R$100 | ≤20=R$80 | >20=R$60

  CARD "Mais Atendentes"
    Mostrar SEMPRE
    Tiers: ≤5=R$80 | ≤10=R$75 | ≤20=R$70 | >20=R$60

  CARD "Módulo I.A."
    Mostrar SOMENTE SE has_ai_module = false
    Corpo: "Automatize atendimentos com até 5 agentes inteligentes"
    Preço fixo: "R$ 350,00/mês"
    SEM input de quantidade (é toggle)
    Botão: [Ativar Módulo I.A.]

  CARD "Facilite Whatsflow"
    SE facilite_plan = 'none':
      Mostrar 3 sub-opções em tabs ou radio buttons:
        Básico — R$250/mês — 8h/mês (2h/semana)
        Intermediário — R$700/mês — 20h/mês (5h/semana)
        Avançado — R$1.500/mês — 40h/mês (10h/semana)
      Botão: [Contratar Facilite]
    SE facilite_plan = 'basico':
      Mostrar opção de upgrade para Intermediário e Avançado
      Texto: "Você tem o Facilite Básico. Faça upgrade para mais horas."
    SE facilite_plan = 'intermediario':
      Mostrar opção de upgrade somente para Avançado
    SE facilite_plan = 'avancado':
      Não exibir este card (plano máximo já ativo)

  CARD "Implantação Starter"
    Mostrar SOMENTE SE has_implantacao_starter = false na license_history
    (verificar se nunca foi contratada)
    Corpo: "Configuração profissional do seu ambiente em até 15 dias úteis"
    Valor: "R$ 2.000,00 (cobrança única)"
    Botão: [Contratar Implantação]

Visibilidade dos botões por role:
  admin: botões ativos e clicáveis
  gestor, financeiro, consultor, representante:
    botões desabilitados (opacity 50%)
    tooltip ao hover: "Apenas o administrador pode contratar novos recursos"

═══════════════════════════════════════
SEÇÃO NOVA 2 — "Histórico de Contratações"
(adicionar após a seção Expanda seu plano)
═══════════════════════════════════════

Título: "Histórico de Contratações"

Tabela com dados de license_history filtrados por account_id:
  Colunas: Data | Tipo | O que mudou | Valor mensal após | Realizado por
  Tipos traduzidos: initial=Criação | upsell=Expansão | renewal=Renovação | admin_edit=Ajuste

Máximo 10 linhas, com paginação simples.
Se não houver registros: "Nenhuma alteração registrada ainda."

═══════════════════════════════════════
FLUXO DO BOTÃO [CONTRATAR] — modal inline
═══════════════════════════════════════

Ao clicar em qualquer botão [Contratar] ou [Ativar]:

PASSO 1 — Modal: Confirmar Pedido
  Título: "Confirmação do pedido"
  Resumo do que será contratado:
    "• Módulo I.A. — R$ 350,00/mês"
    ou "• +2 Dispositivos Web — R$ 300,00/mês adicionais"
  Valor adicional mensal: "R$ X,00/mês"
  Primeira cobrança (hoje): "R$ X,00"
  Botão [Continuar para pagamento] → PASSO 2
  Botão [Cancelar] → fecha modal

PASSO 2 — Modal: Forma de Pagamento
  Tabs: [ PIX ] [ Boleto ] [ Cartão ]

  ABA PIX:
    Ao abrir esta aba:
      Criar checkout_session no Supabase:
        checkout_type = 'upsell'
        account_id = account atual (da sessão)
        apenas o recurso selecionado preenchido
        monthly_value = valor ADICIONAL (não o total)
      Criar customer no Asaas se account ainda não tiver asaas_customer_id
      Criar cobrança PIX no Asaas (billingType=PIX)
      Salvar asaas_payment_id na checkout_session
      Exibir: QR Code + código copia-e-cola + countdown 30 minutos
    Polling a cada 5 segundos:
      GET Asaas /payments/{id} → verificar status
      Quando CONFIRMED:
        Fechar modal
        Exibir toast: "✅ {recurso} ativado com sucesso!"
        Recarregar dados da licença na página (sem reload completo)
        Card do recurso contratado some da seção de upsell

  ABA BOLETO:
    Criar cobrança boleto no Asaas
    Exibir link para download do boleto
    Aviso: "Após compensação (1-2 dias úteis), o recurso será ativado automaticamente."
    Fechar modal com botão [Fechar]

  ABA CARTÃO:
    Campos: número, nome no cartão, validade (MM/AA), CVV
    Tokenizar via Asaas.js (dados NÃO passam pelo backend)
    Botão [Pagar R$ X,00]
    Se aprovado: toast de sucesso + reload dos dados
    Se recusado: mensagem de erro específica (sem fechar modal)

═══════════════════════════════════════
TESTES FASE 3
═══════════════════════════════════════

Teste 1 — Exibição por estado da licença:
  Conta com has_ai_module=false: card I.A. aparece
  Conta com has_ai_module=true: card I.A. NÃO aparece
  Conta com facilite_plan='avancado': card Facilite NÃO aparece

Teste 2 — Visibilidade por role:
  Login como admin: botões ativos
  Login como gestor: botões desabilitados com tooltip correto

Teste 3 — Fluxo PIX completo:
  Clicar [Ativar Módulo I.A.] → confirmar → aba PIX → QR gerado
  Simular webhook de confirmação → toast aparece → card I.A. some da lista
  Verificar: license.has_ai_module=true, license_history com change_type='upsell'

Teste 4 — Seção existente intacta:
  Verificar que os cards originais (Plano Atual, Recursos Incluídos, Uso vs Limites)
  continuam exatamente iguais após adicionar as novas seções
```

---

---

# FASE 4 — Página Pública de Checkout (Nova Conta)

> **Objetivo:** Página pública (sem login) para novos clientes se cadastrarem.  
> Funciona tanto para clientes diretos Whatsflow quanto para clientes de WhiteLabel.  
> O Asaas já está integrado — usar as credenciais e funções existentes.  
> **Teste:** Cliente acessa /checkout, escolhe plano, paga via PIX, recebe email com link de ativação.

---

```
A integração Asaas já existe no projeto (Production ativo, webhook registrado).
Agora crie a página pública de checkout para novos clientes.

URL: /checkout
URL WL: /checkout?wl={wl_slug}

Ao carregar com ?wl=sendhit:
  Buscar whitelabel_branding da SendHit
  Aplicar CSS variables: --color-primary, --color-bg, --color-accent
  Substituir logo pelo logo_url da WL
  Exibir app_name da WL (não "Whatsflow")
  Contato de suporte: support_whatsapp da WL

Ao carregar sem parâmetro WL:
  Branding padrão Whatsflow

═══════════════════════════════════════
STEPPER — 4 passos no topo da página
═══════════════════════════════════════

[1 Plano] → [2 Personalizar] → [3 Seus dados] → [4 Pagamento]

─────────────────────────────────────
PASSO 1 — Escolha do Plano
─────────────────────────────────────

Dois cards lado a lado:

  Solo Pro — R$ 259/mês
    ✓ 1 Dispositivo Web WhatsApp
    ✓ 1 Dispositivo Meta (bônus)
    ✓ 1 Atendente
    ✓ CRM, Pipeline, Conversas, Financeiro
    [Escolher Solo Pro]

  Profissional — R$ 359/mês  ★ Recomendado
    ✓ 1 Dispositivo Web WhatsApp
    ✓ 1 Dispositivo Meta (bônus)
    ✓ 3 Atendentes
    ✓ CRM, Pipeline, Conversas, Financeiro
    [Escolher Profissional]

─────────────────────────────────────
PASSO 2 — Personalize (add-ons)
─────────────────────────────────────

Counters com preview de preço em tempo real:

  Dispositivos Web extras:  [ − ] 0 [ + ]
    Badge dinâmico de tier conforme quantidade: "Tier 1 — R$150/un"

  Dispositivos Meta extras: [ − ] 0 [ + ]
    Badge dinâmico: "Tier 1 — R$100/un"

  Atendentes extras:        [ − ] 0 [ + ]
    Badge dinâmico: "Tier 1 — R$80/un"

  Módulo I.A.:              [ toggle ] = +R$ 350/mês fixo
    Subtexto: "Até 5 agentes de IA para automação de atendimento"

  Facilite Whatsflow:       4 cards clicáveis
    [Nenhum] [Básico R$250] [Intermediário R$700] [Avançado R$1.500]
    Card selecionado com borda destacada

  Implantação Starter:      [ toggle ] = +R$ 2.000 (taxa única)
    Subtexto: "Configuração profissional em até 15 dias úteis"

RESUMO DO PEDIDO (sticky à direita no desktop, fixo no bottom no mobile):
  Lista linha a linha dos itens selecionados com valores
  Total mensal: R$ X.XXX,00/mês
  Taxa de implantação: R$ X.XXX,00 (se selecionada)
  ─────────────────────────────────
  1ª cobrança hoje: R$ X.XXX,00
  Botão [Continuar →] fixo no resumo

─────────────────────────────────────
PASSO 3 — Seus Dados
─────────────────────────────────────

  Nome da empresa *
  Slug da conta: gerado automaticamente, editável
    Exibir preview: "app.whatsflow.com.br/app/{slug}"
    Validação em tempo real: verificar unicidade no Supabase
    Verde ✓ = disponível | Vermelho ✗ = indisponível
  CNPJ ou CPF *  (com máscara e validação)
  Nome do responsável *
  Email do responsável *  (será o login do admin)
  WhatsApp *

─────────────────────────────────────
PASSO 4 — Pagamento
─────────────────────────────────────

Ao entrar neste passo:
  Criar checkout_session no Supabase com todos os dados preenchidos
  Criar customer no Asaas com os dados da empresa
  Salvar asaas_customer_id na checkout_session

Tabs de pagamento: [ PIX ] [ Boleto ] [ Cartão de Crédito ]

  ABA PIX:
    Criar cobrança PIX no Asaas (billingType=PIX)
    Salvar asaas_payment_id na checkout_session
    Exibir: QR Code + código copia-e-cola + countdown 30 minutos
    Polling a cada 5s no status da cobrança Asaas
    Quando CONFIRMED: redirect para /aguardando-ativacao?session={id}

  ABA BOLETO:
    Criar cobrança boleto no Asaas
    Exibir botão [📄 Baixar/Imprimir Boleto] (link do Asaas)
    Aviso: "Após compensação (1-2 dias úteis), você receberá o link de ativação por email."
    Botão [Ok, entendi] → redirect para /aguardando-ativacao?session={id}

  ABA CARTÃO:
    Campos: número, nome, validade, CVV
    Tokenizar via Asaas.js (não trafegar dados no backend)
    Botão [Pagar R$ {first_charge}]
    Aprovado → redirect para /aguardando-ativacao?session={id}
    Recusado → mensagem de erro específica

═══════════════════════════════════════
PÁGINA — /aguardando-ativacao?session={id}
═══════════════════════════════════════

Buscar checkout_session pelo id da URL.

SE status = 'paid' (webhook já processou):
  Ícone ✅ animado
  "Pagamento confirmado! Enviamos um email para {buyer_email}
   com o link para criar sua conta."
  "Verifique também a pasta de spam."

SE status = 'pending' (ainda aguardando):
  Spinner de carregamento com mensagem:
  "Aguardando confirmação do pagamento..."
  Polling a cada 10s no status da checkout_session
  Quando status mudar para 'paid': atualizar tela para o estado acima

SE status = 'expired':
  "Este link expirou. Por favor, realize um novo checkout."
  Botão [Novo Checkout] → /checkout

═══════════════════════════════════════
PÁGINA — /ativar/{token}
(link enviado por email após pagamento confirmado)
═══════════════════════════════════════

Ao carregar:
  Buscar activation_token pelo token da URL
  Se inválido, já usado ou expirado:
    Exibir erro: "Este link de ativação não é mais válido."
    Botão [Solicitar novo link] → envia email com novo token (via Edge Function)
  Se válido:
    Aplicar branding da WL se account.whitelabel_id preenchido

Formulário de ativação:
  "Bem-vindo(a) a {app_name}! Configure sua senha de acesso."
  Email: exibido bloqueado (read-only)
  Senha *  (mínimo 8 caracteres, com indicador de força)
  Confirmar senha *
  Botão [Ativar minha conta →]

Ao submeter:
  Criar usuário no Supabase Auth com email + senha
  Vincular ao profile já criado pelo webhook
  Marcar activation_token.status = 'used', used_at = NOW()
  Redirect para /app/{slug}
  Toast: "✅ Conta ativada! Bem-vindo(a) ao {app_name}."

═══════════════════════════════════════
TESTES FASE 4
═══════════════════════════════════════

Teste 1 — Branding WL:
  Acessar /checkout?wl=sendhit → verificar cores e logo da SendHit aplicados
  Acessar /checkout sem parâmetro → verificar branding Whatsflow

Teste 2 — Cálculo em tempo real:
  Selecionar Profissional + 3 Disp. Web + I.A. + Facilite Básico
  Verificar resumo: 359+450+350+250 = 1.409/mês, 1ª cobrança = 1.409

Teste 3 — Slug único:
  Digitar slug que já existe → mostrar ✗ vermelho
  Digitar slug disponível → mostrar ✓ verde

Teste 4 — Fluxo PIX completo:
  Preencher todos os passos → gerar PIX → simular webhook → /aguardando-ativacao
  Verificar: account criada, license criada, email de ativação enviado

Teste 5 — Ativação da conta:
  Acessar /ativar/{token} → definir senha → verificar redirect para /app/{slug}
  Verificar: token marcado como used, perfil ativo no Supabase Auth
```

---

---

# FASE 5 — Checkout pelo Portal WhiteLabel + Visibilidade no Nexus

> **Objetivo:** WL Admin gera links de checkout para seus clientes. Nexus exibe checkouts e ativações.  
> Não recriar nada existente no Nexus — apenas adicionar.  
> **Teste:** SendHit gera link → RadAdvogados paga → conta criada com branding SendHit → Nexus mostra o checkout.

---

```
Fases anteriores funcionando. Agora adicione o checkout pelo portal WL
e visibilidade dos checkouts no Nexus existente.

═══════════════════════════════════════
PORTAL WHITELABEL — botão em "Meus Clientes"
═══════════════════════════════════════

Na página de clientes do portal WL (/wl/{slug}/clientes),
ao lado do botão [+ Novo Cliente] existente, adicionar:

  [🔗 Gerar Link de Checkout]

─────────────────────────────────────
MODAL — Gerar Link de Checkout (para WL Admin)
─────────────────────────────────────

O wl_admin configura o pedido:

  PASSO 1 — Configure o plano para o novo cliente:
    Plano base: ( ) Solo Pro R$259  ( ) Profissional R$359
    Dispositivos Web extras: counter
    Dispositivos Meta extras: counter
    Atendentes extras: counter
    Módulo I.A.: toggle
    Facilite: cards de seleção
    Implantação Starter: toggle
    Preview do MRR em tempo real (via calculate_checkout_value)

  PASSO 2 — (Opcional) Defina o preço para o cliente:
    Por padrão: usa os preços padrão Whatsflow
    Toggle "Personalizar preço para este cliente":
      Campo: "Valor que o cliente verá: R$ ___/mês"
      Mínimo permitido: equal ao monthly_value calculado (WL não pode vender abaixo do custo)
      Validação server-side na Edge Function

  PASSO 3 — Gerar:
    [🔗 Gerar Link]
    Cria checkout_session:
      checkout_type = 'new_account'
      whitelabel_id = conta da WL logada
      plan e add-ons conforme seleção
      status = 'pending'
    Gera URL:
      Se WL tem custom_domain: https://{custom_domain}/checkout?session={id}
      Senão: https://app.whatsflow.com.br/checkout?session={id}
    Exibe URL com botões:
      [📋 Copiar Link]
      [📲 Enviar por WhatsApp]
        Abre wa.me com mensagem pré-formatada:
        "Olá! Segue o link para contratar o {app_name da WL} e criar sua conta:
         {link}
         Link válido por 48 horas. Qualquer dúvida, estou à disposição!"

─────────────────────────────────────
CHECKOUT ACESSADO PELO CLIENTE DA WL
─────────────────────────────────────

Quando cliente acessa /checkout?session={checkout_session_id}:
  Buscar checkout_session pelo id
  Buscar branding da WL via whitelabel_id da session
  Aplicar branding da WL na página

  Diferença do checkout público normal:
    Plano e add-ons: exibidos como resumo read-only (já definidos pela WL, não alteráveis)
    Formulário exibido: apenas dados pessoais (nome, email, CNPJ, telefone, slug)
    Suporte exibido: "Dúvidas? Fale com {wl.support_whatsapp}" (não Whatsflow)

  Pagamento: mesmo fluxo das abas PIX/Boleto/Cartão

  Após pagamento confirmado:
    Conta criada como wl_client com branding da WL
    Email de ativação com logo e cores da WL
    Notification criada no portal WL:
      "✅ Novo cliente ativado: {company_name} — Plano {plan} — +R${monthly_value}/mês"

═══════════════════════════════════════
NEXUS — EXPANDIR (não recriar)
═══════════════════════════════════════

─────────────────────────────────────
Na página LICENÇAS já existente do Nexus:
─────────────────────────────────────

Adicionar ao filtro existente:
  Filtro por origem: Todas | Individual (direto) | {nome de cada WL}

Adicionar ao menu "..." de cada licença:
  [📋 Ver histórico] → painel lateral direito com license_history desta conta
  [🔗 Gerar link de renovação] → cria checkout_session de renewal, copia URL
  [💰 Ver no Asaas] → abre link direto para o customer no painel Asaas

─────────────────────────────────────
Adicionar ao menu lateral do Nexus:
─────────────────────────────────────

Novo item: "Checkouts"
Ícone: link ou carrinho
Rota: /nexus/checkouts

Página Checkouts:

  Cards no topo:
    Checkouts hoje | Pagos esta semana | Captado este mês (R$) | % Conversão (pago/total, 30d)

  Tabela:
    Data | Empresa | Email | Origem (direta / WL: {nome}) | Plano | Valor | Tipo | Status | Ações

  Filtros:
    Status: Todos | Pendente | Pago | Expirado | Cancelado
    Tipo: Nova conta | Upsell | Renovação
    Período: hoje / 7d / 30d / custom
    Origem: Direta / por WL específica

  Ações por linha:
    Ver detalhes completos (modal com todos os campos da checkout_session)
    Reenviar email de ativação (se status=paid E activation_token.status='pending')
    Cancelar (se status='pending')

─────────────────────────────────────
No DASHBOARD do Nexus já existente:
─────────────────────────────────────

Adicionar 4 cards novos (manter todos os existentes):
  Novos clientes esta semana (checkout_type='new_account', status='paid')
  Upsell captado este mês em R$ (checkout_type='upsell', status='paid')
  Checkouts pendentes (status='pending', não expirados)
  Taxa de ativação — % de tokens usados nos últimos 30 dias

═══════════════════════════════════════
TESTES FASE 5
═══════════════════════════════════════

Teste 1 — WL Admin gera link:
  Login como wl_admin SendHit → Meus Clientes → Gerar Link de Checkout
  Configurar plano → gerar → URL copiada corretamente

Teste 2 — Cliente acessa link com branding WL:
  Abrir URL gerada → verificar cores e logo da SendHit
  Plano exibido como read-only (não editável pelo cliente)

Teste 3 — Conta criada como wl_client:
  Pagar → verificar account.whitelabel_id = SendHit.id
  Email de ativação com branding SendHit enviado

Teste 4 — WL Admin recebe notificação:
  Após ativação → portal WL exibe notification de novo cliente

Teste 5 — Nexus mostra checkouts:
  Página /nexus/checkouts lista o checkout da SendHit
  Filtro por "SendHit" retorna apenas os checkouts desta WL

Teste 6 — Reenviar ativação pelo Nexus:
  Encontrar checkout pago sem token usado → clicar Reenviar → email enviado
```

---

---

## Checklist Geral — Todos os Testes Críticos

| # | Teste | Critério |
|---|-------|----------|
| 1 | Webhook Asaas existente continua funcionando | Cobranças normais do Finance não são afetadas |
| 2 | Webhook trata checkout de nova conta | Account + license + token criados, email enviado |
| 3 | Idempotência do webhook | Mesmo payment_id processado 2x não duplica dados |
| 4 | Upsell via modal na página Licença | License atualizada, card some, toast aparece |
| 5 | Branding WL no checkout | /checkout?wl=sendhit mostra visual SendHit |
| 6 | Slug único no checkout | Validação em tempo real, bloqueia duplicado |
| 7 | PIX polling → ativação | QR → pagamento → toast → atualização sem reload |
| 8 | Token de ativação expirado | Mensagem de erro + botão reenvio funcional |
| 9 | Página Licença existente intacta | Cards originais sem alteração após novas seções |
| 10 | Botões de upsell bloqueados para não-admin | Tooltip correto para gestor/financeiro/etc |
| 11 | Checkout WL → conta como wl_client | whitelabel_id correto, herda branding |
| 12 | Nexus → filtro por WL em licenças | Retorna apenas clientes da WL selecionada |
| 13 | Dashboard Nexus com novos cards | 4 cards adicionados sem remover os existentes |

---

## Regras de Segurança

1. Dados de cartão NUNCA passam pelo backend — tokenização via Asaas.js
2. Webhook Asaas validado por token de segurança antes de qualquer processamento
3. Idempotência obrigatória: verificar `status !== 'pending'` antes de processar
4. Activation token: uso único + expira em 24h
5. Link de checkout WL expira em 48h e vinculado à WL — não reutilizável
6. Override de preço pela WL: valor mínimo validado server-side (Edge Function)
7. Upsell: validar `account_id` da sessão autenticada antes de criar checkout_session

---

*Whatsflow Finance — Checkout + Upsell + Ativação | whatsflow.com.br*
