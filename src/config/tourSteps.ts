import type { TourConfig } from "@/contexts/TourContext";

export const TOUR_CONFIGS: Record<string, TourConfig> = {
  perfil_empresa: {
    stepKey: "perfil_empresa",
    route: "/settings",
    title: "Configurar Perfil da Empresa",
    icon: "🏢",
    steps: [
      {
        title: "Bem-vindo às Configurações!",
        description: "Aqui você encontra todas as configurações da sua empresa. Vamos personalizar o sistema com os dados do seu negócio.",
      },
      {
        title: "Dados da empresa",
        description: "Preencha o nome da empresa, CNPJ, endereço e logotipo. Essas informações aparecerão nas cobranças e notas fiscais que você emitir.",
        selector: "[data-tour='company-settings']",
      },
      {
        title: "Personalização do layout",
        description: "Você pode customizar cores, logotipo e o layout da sidebar para refletir a identidade visual da sua empresa.",
        selector: "[data-tour='layout-settings']",
      },
      {
        title: "Pronto!",
        description: "Parabéns! Você já conhece as configurações da empresa. Ao concluir, essa etapa será marcada como completa no onboarding.",
      },
    ],
  },

  conectar_whatsapp: {
    stepKey: "conectar_whatsapp",
    route: "/integracoes",
    title: "Conectar WhatsApp",
    icon: "📱",
    steps: [
      {
        title: "Central de Conexões WhatsApp",
        description: "Aqui você gerencia todas as conexões de WhatsApp da sua empresa. Você pode conectar números oficiais (Meta API) ou não-oficiais.",
      },
      {
        title: "Adicionar nova conexão",
        description: "Clique no botão 'Nova Conexão' para adicionar um número de WhatsApp. Escolha entre API Oficial (Meta) ou provedor alternativo (Uazapi).",
        selector: "[data-tour='new-connection']",
      },
      {
        title: "Escanear QR Code",
        description: "Para conexões não-oficiais, escaneie o QR Code com seu celular. Para API Oficial, insira as credenciais do Meta Business.",
      },
      {
        title: "Conexão ativa!",
        description: "Após conectar, o status ficará verde e você poderá enviar/receber mensagens diretamente pelo sistema. Conclua para marcar esta etapa!",
      },
    ],
  },

  cadastrar_cliente: {
    stepKey: "cadastrar_cliente",
    route: "/customers",
    title: "Cadastrar Primeiro Cliente",
    icon: "👥",
    steps: [
      {
        title: "Área de Clientes",
        description: "Aqui você gerencia todos os clientes da sua empresa. Vamos cadastrar o primeiro!",
      },
      {
        title: "Adicionar cliente",
        description: "Clique no botão 'Novo Cliente' para abrir o formulário de cadastro. Preencha nome, email, telefone e dados financeiros.",
        selector: "[data-tour='new-customer']",
      },
      {
        title: "Importar em massa",
        description: "Você também pode importar clientes via arquivo CSV, facilitando a migração de outra plataforma.",
        selector: "[data-tour='import-csv']",
      },
      {
        title: "Filtrar e buscar",
        description: "Use os filtros e a busca para encontrar clientes rapidamente por nome, status ou data de ativação.",
      },
      {
        title: "Cliente cadastrado!",
        description: "Ótimo! Agora você sabe como gerenciar clientes no sistema. Conclua esta etapa para avançar!",
      },
    ],
  },

  primeira_cobranca: {
    stepKey: "primeira_cobranca",
    route: "/cobrancas",
    title: "Criar Primeira Cobrança",
    icon: "💳",
    steps: [
      {
        title: "Módulo de Cobranças",
        description: "Este é o cockpit de cobranças integrado com o gateway de pagamento. Aqui você cria, acompanha e gerencia todas as cobranças.",
      },
      {
        title: "Criar nova cobrança",
        description: "Navegue até a aba 'Gerar Cobrança' para criar uma nova cobrança. Selecione o cliente, valor, forma de pagamento e vencimento.",
      },
      {
        title: "Acompanhar status",
        description: "Na aba 'Cockpit', você vê todas as cobranças com seus status: pendente, paga, vencida, etc. Use os filtros para organizar.",
      },
      {
        title: "Régua de cobrança automática",
        description: "Configure regras automáticas de cobrança na aba 'Régua' para enviar lembretes e notificações por WhatsApp automaticamente.",
      },
      {
        title: "Primeira cobrança criada!",
        description: "Excelente! Você já sabe como criar e gerenciar cobranças. Conclua para marcar esta etapa!",
      },
    ],
  },

  explorar_dashboard: {
    stepKey: "explorar_dashboard",
    route: "/home",
    title: "Explorar o Dashboard",
    icon: "📊",
    steps: [
      {
        title: "Seu Dashboard de Métricas",
        description: "Bem-vindo ao painel principal! Aqui você tem uma visão geral de todas as métricas do seu negócio em tempo real.",
      },
      {
        title: "KPIs principais",
        description: "Os cards no topo mostram MRR, receita total, total de clientes e taxa de churn. Clique em cada um para ver detalhes.",
        selector: "[data-tour='kpi-cards']",
      },
      {
        title: "Gráficos de evolução",
        description: "Os gráficos abaixo mostram tendências de receita, crescimento de clientes e margem ao longo do tempo.",
      },
      {
        title: "Dashboard explorado!",
        description: "Agora você conhece o painel principal. Acesse regularmente para acompanhar a saúde do seu negócio!",
      },
    ],
  },

  convidar_membro: {
    stepKey: "convidar_membro",
    route: "/usuarios",
    title: "Convidar Membro da Equipe",
    icon: "👋",
    steps: [
      {
        title: "Gestão de Usuários",
        description: "Aqui você gerencia os membros da sua equipe. Cada usuário pode ter permissões diferentes de acordo com seu papel.",
      },
      {
        title: "Convidar novo membro",
        description: "Clique em 'Novo Usuário' para adicionar um membro. Defina o nome, email e papel (admin, gerente, operador, etc.).",
      },
      {
        title: "Permissões por módulo",
        description: "Cada papel tem acesso a módulos específicos. Admins têm acesso total, enquanto operadores podem ter acesso apenas a módulos selecionados.",
      },
      {
        title: "Equipe configurada!",
        description: "Perfeito! Convide sua equipe para colaborar no sistema. Conclua esta etapa para finalizar o onboarding!",
      },
    ],
  },

  configurar_playbooks: {
    stepKey: "configurar_playbooks",
    route: "/intelligence",
    title: "Playbooks de I.A.",
    icon: "🤖",
    steps: [
      {
        title: "Conheca os Playbooks de I.A.",
        description: "Playbooks sao funcionarios autonomos que conversam com seus leads pelo WhatsApp, coletam dados e salvam no CRM. Economize horas do seu time.",
      },
      {
        title: "4 playbooks ja prontos",
        description: "Voce ja tem 4 playbooks nativos: Qualificacao, Diagnostico, Follow-Up e NPS. Eles ja estao configurados e prontos para ativar.",
      },
      {
        title: "Como funciona",
        description: "A IA conduz a conversa, faz perguntas e coleta dados. Se o cliente ficar irritado ou pedir humano, escala automaticamente para um atendente.",
      },
      {
        title: "Crie o seu",
        description: "Clique em '+ Novo Playbook', defina o prompt, os campos para extrair e as regras de escalonamento. Limite: 20 playbooks por conta.",
        selector: "[data-tour='new-playbook-btn']",
      },
    ],
  },

  configurar_suporte: {
    stepKey: "configurar_suporte",
    route: "/suporte",
    title: "Central de Suporte",
    icon: "🎫",
    steps: [
      {
        title: "Central de Suporte",
        description: "Gerencie tickets de atendimento, converse com a equipe e responda clientes em um unico lugar.",
      },
      {
        title: "Chat Dual",
        description: "Cada ticket tem dois modos: 'Resposta ao Cliente' (enviada ao WhatsApp) e 'Nota Interna' (visivel so para a equipe, fundo amarelo).",
      },
      {
        title: "Integrado ao CRM e WhatsApp",
        description: "Crie tickets a partir de negocios do pipeline (botao no drawer) ou de conversas do WhatsApp (acao 'Abrir Ticket').",
      },
    ],
  },

  configurar_campanhas: {
    stepKey: "configurar_campanhas",
    route: "/mensageria",
    title: "Campanhas de Disparo",
    icon: "📢",
    steps: [
      {
        title: "Campanhas Inteligentes",
        description: "Envie mensagens em massa com formulario adaptativo: Meta Cloud API usa templates, WhatsApp Web usa texto livre com delay anti-ban.",
      },
      {
        title: "Escolha o canal",
        description: "Ao selecionar a instancia de envio, o formulario muda automaticamente. Meta mostra templates aprovados, uazapi mostra campo de texto livre.",
      },
      {
        title: "Anti-ban",
        description: "Para WhatsApp Web, configure o delay entre mensagens (recomendado: 10-30 segundos). Isso protege seu numero de bloqueio.",
      },
    ],
  },

  configurar_playbooks: {
    stepKey: "configurar_playbooks",
    route: "/intelligence",
    title: "Playbooks de I.A.",
    icon: "🤖",
    steps: [
      {
        title: "Funcionarios Autonomos",
        description: "Playbooks sao agentes de IA que conversam com seus leads no WhatsApp, coletam dados e salvam no CRM automaticamente.",
      },
      {
        title: "4 Playbooks Nativos",
        description: "Voce ja tem 4 playbooks pre-configurados: Qualificacao, Diagnostico, Follow-Up e Pos-Venda. Ative-os para comecar.",
      },
      {
        title: "Campos de Extracao",
        description: "Cada playbook define os campos que a IA deve coletar (orcamento, prazo, equipe). Os dados vao direto para o CRM.",
      },
      {
        title: "Escalonamento Inteligente",
        description: "Se o cliente ficar irritado ou pedir humano, a IA para e escala para um atendente. Configure as palavras-chave de gatilho.",
      },
    ],
  },

  configurar_assistente: {
    stepKey: "configurar_assistente",
    route: "/intelligence",
    title: "Assistente Autonomo",
    icon: "⚡",
    steps: [
      {
        title: "Assistente Autonomo",
        description: "Um agente universal que le fotos de recibos, agenda reunioes, resume audios e programa envios futuros — tudo pelo WhatsApp.",
      },
      {
        title: "5 Capacidades",
        description: "Despesas (Vision AI), Agenda (CRM), Resumos (audio/texto), Relatorio Financeiro e Agendamento de Mensagens.",
      },
      {
        title: "Google Calendar",
        description: "Conecte sua Google Agenda para que reunioes agendadas pela IA aparecam automaticamente no seu calendario com link do Meet.",
      },
      {
        title: "Personalize",
        description: "Configure o nome, tom de comunicacao e modo de confirmacao do assistente na engrenagem do card.",
      },
    ],
  },

  configurar_suporte: {
    stepKey: "configurar_suporte",
    route: "/suporte",
    title: "Central de Suporte",
    icon: "🎫",
    steps: [
      {
        title: "Tickets de Suporte",
        description: "Crie tickets, converse com a equipe (notas internas) e responda clientes em um so lugar.",
      },
      {
        title: "Chat Dual",
        description: "Cada ticket tem dois modos: Resposta ao Cliente (fundo branco) e Nota Interna (fundo amarelo, visivel so para equipe).",
      },
      {
        title: "Vincule ao CRM",
        description: "Crie tickets diretamente de um negocio no pipeline ou de uma conversa no WhatsApp. O ticket fica vinculado automaticamente.",
      },
    ],
  },
};
