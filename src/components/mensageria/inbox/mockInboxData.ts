export interface Conversation {
  id: string;
  contactName: string;
  contactNumber: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  origem: "suporte" | "prospeccao" | "cobranca";
  status: "em_atendimento" | "aguardando" | "finalizada";
  connectionLabel: string;
  connectionStatus: "connected" | "disconnected";
  isLead: boolean;
  digitalScore?: number;
  tags: string[];
}

export interface Message {
  id: string;
  direcao: "enviado" | "recebido";
  tipo: "text" | "image" | "audio" | "doc" | "location";
  conteudo: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

const now = Date.now();
const min = 60000;
const hour = 3600000;

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    contactName: "João Silva",
    contactNumber: "+55 43 99901-1234",
    lastMessage: "Boa tarde, preciso de ajuda com o plano",
    lastMessageTime: new Date(now - 5 * min).toISOString(),
    unreadCount: 3,
    origem: "suporte",
    status: "em_atendimento",
    connectionLabel: "Suporte Whatsflow",
    connectionStatus: "connected",
    isLead: false,
    tags: ["cliente-ativo"],
  },
  {
    id: "c2",
    contactName: "Maria Oliveira",
    contactNumber: "+55 11 98765-4321",
    lastMessage: "Qual o valor do plano profissional?",
    lastMessageTime: new Date(now - 25 * min).toISOString(),
    unreadCount: 1,
    origem: "prospeccao",
    status: "aguardando",
    connectionLabel: "Prospecção de Leads",
    connectionStatus: "connected",
    isLead: true,
    digitalScore: 72,
    tags: ["lead-quente"],
  },
  {
    id: "c3",
    contactName: "Carlos Mendes",
    contactNumber: "+55 21 97654-3210",
    lastMessage: "Já efetuei o pagamento via PIX",
    lastMessageTime: new Date(now - 2 * hour).toISOString(),
    unreadCount: 0,
    origem: "cobranca",
    status: "em_atendimento",
    connectionLabel: "Cobrança - Pioneira",
    connectionStatus: "disconnected",
    isLead: false,
    tags: ["inadimplente"],
  },
  {
    id: "c4",
    contactName: "Ana Paula",
    contactNumber: "+55 31 91234-5678",
    lastMessage: "Obrigada pelo atendimento!",
    lastMessageTime: new Date(now - 5 * hour).toISOString(),
    unreadCount: 0,
    origem: "suporte",
    status: "finalizada",
    connectionLabel: "Suporte Whatsflow",
    connectionStatus: "connected",
    isLead: false,
    tags: [],
  },
  {
    id: "c5",
    contactName: "Pedro Restaurante",
    contactNumber: "+55 43 99888-7777",
    lastMessage: "Tenho interesse sim, pode me explicar?",
    lastMessageTime: new Date(now - 12 * min).toISOString(),
    unreadCount: 2,
    origem: "prospeccao",
    status: "em_atendimento",
    connectionLabel: "Prospecção de Leads",
    connectionStatus: "connected",
    isLead: true,
    digitalScore: 45,
    tags: ["lead", "restaurante"],
  },
  {
    id: "c6",
    contactName: "Fernanda Costa",
    contactNumber: "+55 41 96543-2100",
    lastMessage: "Vou verificar e retorno amanhã",
    lastMessageTime: new Date(now - 1 * hour).toISOString(),
    unreadCount: 0,
    origem: "cobranca",
    status: "aguardando",
    connectionLabel: "Cobrança - Pioneira",
    connectionStatus: "disconnected",
    isLead: false,
    tags: ["parcela-atrasada"],
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: "m1", direcao: "recebido", tipo: "text", conteudo: "Olá, boa tarde!", status: "read", timestamp: new Date(now - 10 * min).toISOString() },
    { id: "m2", direcao: "enviado", tipo: "text", conteudo: "Boa tarde, João! Como posso ajudar?", status: "read", timestamp: new Date(now - 9 * min).toISOString() },
    { id: "m3", direcao: "recebido", tipo: "text", conteudo: "Preciso de ajuda com o meu plano atual", status: "read", timestamp: new Date(now - 8 * min).toISOString() },
    { id: "m4", direcao: "recebido", tipo: "text", conteudo: "Quero fazer upgrade para o plano Business", status: "read", timestamp: new Date(now - 7 * min).toISOString() },
    { id: "m5", direcao: "enviado", tipo: "text", conteudo: "Claro! O plano Business inclui 10 atendentes e integração completa. Vou enviar os detalhes.", status: "delivered", timestamp: new Date(now - 6 * min).toISOString() },
    { id: "m6", direcao: "recebido", tipo: "text", conteudo: "Boa tarde, preciso de ajuda com o plano", status: "delivered", timestamp: new Date(now - 5 * min).toISOString() },
  ],
  c2: [
    { id: "m10", direcao: "enviado", tipo: "text", conteudo: "Olá Maria! Vi que você tem uma loja de roupas no Instagram. Temos uma solução perfeita para automatizar seu atendimento.", status: "read", timestamp: new Date(now - 30 * min).toISOString() },
    { id: "m11", direcao: "recebido", tipo: "text", conteudo: "Oi! Interessante, como funciona?", status: "read", timestamp: new Date(now - 28 * min).toISOString() },
    { id: "m12", direcao: "enviado", tipo: "text", conteudo: "Funciona integrado ao WhatsApp, com chatbot, catálogo de produtos e dashboard completo.", status: "read", timestamp: new Date(now - 27 * min).toISOString() },
    { id: "m13", direcao: "recebido", tipo: "text", conteudo: "Qual o valor do plano profissional?", status: "read", timestamp: new Date(now - 25 * min).toISOString() },
  ],
  c3: [
    { id: "m20", direcao: "enviado", tipo: "text", conteudo: "Olá Carlos, tudo bem? Estamos entrando em contato referente à fatura vencida no valor de R$ 297,00.", status: "read", timestamp: new Date(now - 3 * hour).toISOString() },
    { id: "m21", direcao: "recebido", tipo: "text", conteudo: "Ah sim, vou pagar hoje ainda", status: "read", timestamp: new Date(now - 2.5 * hour).toISOString() },
    { id: "m22", direcao: "enviado", tipo: "text", conteudo: "Perfeito! Segue o PIX para pagamento: chave@empresa.com", status: "read", timestamp: new Date(now - 2.3 * hour).toISOString() },
    { id: "m23", direcao: "recebido", tipo: "text", conteudo: "Já efetuei o pagamento via PIX", status: "read", timestamp: new Date(now - 2 * hour).toISOString() },
    { id: "m24", direcao: "recebido", tipo: "image", conteudo: "https://placehold.co/300x400/222/666?text=Comprovante+PIX", status: "read", timestamp: new Date(now - 2 * hour + 10000).toISOString() },
  ],
  c4: [
    { id: "m30", direcao: "recebido", tipo: "text", conteudo: "Muito obrigada pelo suporte, resolveu meu problema!", status: "read", timestamp: new Date(now - 5.1 * hour).toISOString() },
    { id: "m31", direcao: "enviado", tipo: "text", conteudo: "Fico feliz que tenha sido resolvido, Ana! Qualquer dúvida estamos à disposição. 😊", status: "read", timestamp: new Date(now - 5 * hour).toISOString() },
    { id: "m32", direcao: "recebido", tipo: "text", conteudo: "Obrigada pelo atendimento!", status: "read", timestamp: new Date(now - 5 * hour + 5000).toISOString() },
  ],
  c5: [
    { id: "m40", direcao: "enviado", tipo: "text", conteudo: "Olá Pedro! Encontrei seu restaurante no Google Maps. Posso te apresentar uma solução de atendimento por WhatsApp?", status: "read", timestamp: new Date(now - 15 * min).toISOString() },
    { id: "m41", direcao: "recebido", tipo: "text", conteudo: "Opa, pode sim!", status: "read", timestamp: new Date(now - 14 * min).toISOString() },
    { id: "m42", direcao: "recebido", tipo: "text", conteudo: "Tenho interesse sim, pode me explicar?", status: "read", timestamp: new Date(now - 12 * min).toISOString() },
    { id: "m43", direcao: "recebido", tipo: "audio", conteudo: "audio_message", status: "read", timestamp: new Date(now - 11 * min).toISOString() },
  ],
  c6: [
    { id: "m50", direcao: "enviado", tipo: "text", conteudo: "Bom dia Fernanda! Identificamos que há uma parcela em aberto.", status: "read", timestamp: new Date(now - 1.5 * hour).toISOString() },
    { id: "m51", direcao: "recebido", tipo: "text", conteudo: "Vou verificar e retorno amanhã", status: "read", timestamp: new Date(now - 1 * hour).toISOString() },
  ],
};
