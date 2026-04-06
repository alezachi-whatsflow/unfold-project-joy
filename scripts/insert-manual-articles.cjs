const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzQwMjk4MDAsImV4cCI6MTkzMTcwOTgwMH0.fVZ2xocweHQ_DeHwwqmVx9ytb-LEtXWr6Mrz9OPWLqk';

const articles = [
  {category:"primeiros_passos",title:"Central de Controle (Dashboard)",slug:"dashboard-guia",order_index:3,is_published:true,
  content:"# Central de Controle\n\nA primeira tela ao entrar na plataforma.\n\n## O que mostra?\n- **KPIs**: Conversas abertas, taxa de resolucao, valor do pipeline, mensagens\n- **Pipeline resumido**: Negocios ativos e valor total\n- **Atividade recente**: Ultimos 5 negocios criados/atualizados\n- **Alerta de licenca**: Aviso quando a licenca esta expirando\n\n## Acoes disponiveis\n- Navegar para qualquer modulo pelo menu lateral\n- Ver status da licenca\n- Acessar assinatura para upgrade"},

  {category:"primeiros_passos",title:"Pipeline de Vendas — Guia Completo",slug:"vendas-pipeline-guia",order_index:4,is_published:true,
  content:"# Pipeline de Vendas\n\n## O que e?\nUm quadro Kanban onde voce arrasta negocios entre etapas.\n\n## Funcionalidades\n\n### Criar Negocio\n1. Clique em + Novo Negocio\n2. Preencha: titulo, cliente, valor, produtos\n3. Selecione a etapa inicial\n4. Salve\n\n### Mover entre etapas\nArraste o card para a coluna desejada.\n\n### Fechar como Ganho\n1. Arraste para Ganho ou clique > Fechar Ganho\n2. Confirme o valor final\n\n### Fechar como Perdido\n1. Arraste para Perdido ou clique > Fechar Perdido\n2. Informe o motivo da perda\n\n## Abas\n- Pipeline: Kanban visual\n- Lista: Tabela com filtros\n- Atividades: Tarefas vinculadas\n- Relatorios: Graficos de conversao\n- Meus Negocios: Somente seus deals"},

  {category:"financeiro",title:"Despesas — Guia Completo",slug:"despesas-guia",order_index:2,is_published:true,
  content:"# Gestao de Despesas\n\n## Lancar despesa manual\n1. Clique em + Nova Despesa\n2. Preencha: fornecedor, valor, data, categoria\n3. Anexe comprovante (opcional)\n4. Salve\n\n## Lancar via IA\n1. Envie foto do recibo pelo WhatsApp\n2. Na legenda escreva \"despesa\"\n3. A IA extrai: fornecedor, valor, data, categoria\n4. Despesa lancada automaticamente\n\n## Categorias\nAlimentacao, Transporte, Hospedagem, Tecnologia, Escritorio, Telecom, Marketing, Servicos"},

  {category:"financeiro",title:"Cobrancas e Dunning — Guia",slug:"cobrancas-guia",order_index:3,is_published:true,
  content:"# Cobrancas e Dunning\n\n## Abas\n- Cockpit: Dashboard de metricas\n- Cobrancas: Lista com filtros por status\n- Criar: Gerar nova cobranca\n- Regua: Automacao de dunning\n- Reconciliar: Comparar banco vs sistema\n\n## Dunning\nConfigure regras: \"Apos 3 dias vencido, enviar lembrete\"\nDefina escalonamento: lembrete > notificacao > bloqueio"},

  {category:"financeiro",title:"Gestao Fiscal — Guia",slug:"fiscal-guia",order_index:4,is_published:true,
  content:"# Gestao Fiscal\n\n## Notas Fiscais\n1. Clique em Emitir NF\n2. Preencha dados do cliente e itens\n3. Impostos calculados automaticamente\n4. Envie para prefeitura/SEFAZ\n\n## Tributos\n- Municipal (ISS)\n- Estadual (ICMS por UF)\n- Federal (Simples, Presumido, Real)\n\n## Certificados\nGerencie certificados digitais A1."},

  {category:"whatsapp",title:"Caixa de Entrada — Guia Completo",slug:"caixa-entrada-guia",order_index:2,is_published:true,
  content:"# Caixa de Entrada\n\n## Filtros\n- Em Atendimento: Suas conversas\n- Fila: Aguardando atendente\n- Grupos: Grupos WhatsApp\n- Finalizados: Resolvidos\n\n## Acoes Rapidas\nIniciar Atendimento, Transferir, Finalizar, Tag, Notas, Criar Lead, Abrir Ticket, Nova Conversa\n\n## Canais\nWhatsApp Web, Meta API, Instagram, Telegram, Mercado Livre\n\n## Assinatura\nConfigure em Configuracoes. Aparece em negrito no topo da mensagem."},

  {category:"configuracoes",title:"Integracoes — Guia Completo",slug:"integracoes-guia",order_index:2,is_published:true,
  content:"# Integracoes\n\n## Canais\n- WhatsApp Web (uazapi): QR Code\n- Meta Cloud API: OAuth\n- Instagram: via Meta\n- Telegram: Bot token\n- Mercado Livre: OAuth\n\n## Financeiro\n- Asaas: PIX, Boleto, Cartao\n- Pzaafi: Checkout white-label\n\n## Automacao\n- N8N: Workflows externos"},

  {category:"configuracoes",title:"Usuarios e Permissoes — Guia",slug:"usuarios-permissoes-guia",order_index:3,is_published:true,
  content:"# Usuarios e Permissoes\n\n## Roles\n- Superadmin/Admin: Acesso total\n- Gestor: CRUD vendas/operacional\n- Financeiro: CRUD cobrancas/fiscal\n- Consultor: CRUD vendas/clientes\n- Representante: Somente proprios registros\n\n## Escopo\n- Ver Todas: Admin/Gestor\n- Apenas as Suas: Consultor/Representante\n\n## Convidar\n1. Menu > Usuarios > Convidar\n2. Nome, email, perfil\n3. Convite enviado por email"},

  {category:"configuracoes",title:"Nexus Admin — Guia",slug:"nexus-admin-guia",order_index:4,is_published:true,
  content:"# Nexus Admin\n\nPainel administrativo interno da Whatsflow.\n\n## Modulos\n- Dashboard: KPIs globais\n- Licencas: CRUD completo\n- WhiteLabels: Parceiros revendedores\n- Lifecycle: Saude dos tenants\n- Checkouts: Sessoes de pagamento\n- Financeiro: MRR, ARR, churn\n- Equipe: Time interno (6 roles)\n- Auditoria: Log imutavel\n- Feature Flags: Controle gradual\n- Tickets: Suporte interno\n- I.A. Config: Chaves de API"},

  {category:"configuracoes",title:"Pzaafi Checkout — Guia",slug:"pzaafi-guia",order_index:6,is_published:true,
  content:"# Pzaafi Checkout\n\n## Tiers\n- Nexus: Gerencia global\n- WhiteLabel: Revenda com split\n- Cliente: Checkout proprio\n\n## Configurar\n1. Pzaafi > Organizacoes > engrenagem\n2. Produto: nome, preco, tipo\n3. Checkout: nome, slug, metodos\n4. Parcelamento maximo\n5. Salvar e Publicar\n\n## Taxas\n- PIX: 0,99%\n- Cartao: 2,99% + R$0,49\n- Boleto: R$3,49"}
];

const body = JSON.stringify(articles);
const u = new URL('https://supabase.whatsflow.com.br/rest/v1/manual_articles');
const req = https.request({
  hostname: u.hostname, path: u.pathname, method: 'POST',
  headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal', 'Content-Length': Buffer.byteLength(body) },
}, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(res.statusCode, d||'OK')); });
req.write(body); req.end();
