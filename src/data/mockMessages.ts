export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: string;
  direction: "incoming" | "outgoing" | "typing";
  type: "text" | "audio" | "image" | "document" | "video" | "system" | "transfer";
  status?: "pending" | "sent" | "delivered" | "read";
  senderName?: string;
  audioDuration?: string;
  mediaUrl?: string | null;
  caption?: string | null;
  replyTo?: { id: string; content: string; senderName: string };
}

export const mockMessages: Message[] = [
  {
    id: "m1",
    conversationId: "1",
    content: "*Utilizar a API Oficial* para garantir segurança e evitar bloqueios indesejados.",
    timestamp: "11/03/2026 09:08",
    direction: "outgoing",
    type: "text",
    status: "read",
    senderName: "IA SDR DANI",
  },
  {
    id: "m2",
    conversationId: "1",
    content: "Para que eu possa te ajudar melhor, quantas pessoas da sua equipe estão envolvidas nesse atendimento? Isso me ajudará a sugerir o plano ideal para suas necessidades! 🚀",
    timestamp: "11/03/2026 09:08",
    direction: "outgoing",
    type: "text",
    status: "read",
    senderName: "IA SDR DANI",
  },
  {
    id: "m3",
    conversationId: "1",
    content: "Ok",
    timestamp: "11/03/2026 09:08",
    direction: "incoming",
    type: "text",
  },
  {
    id: "m4",
    conversationId: "1",
    content: "Amanda, só um momento, estou conferindo a disponibilidade do time",
    timestamp: "11/03/2026 09:08",
    direction: "outgoing",
    type: "text",
    status: "read",
    senderName: "Gabriel",
  },
  {
    id: "m5",
    conversationId: "1",
    content: "",
    timestamp: "11/03/2026 09:16",
    direction: "outgoing",
    type: "audio",
    audioDuration: "0:20",
    status: "read",
    senderName: "Gabriel",
  },
  {
    id: "m6",
    conversationId: "1",
    content: "Oi Amanda, você conseguiu ouvir o meu áudio?",
    timestamp: "11/03/2026 09:24",
    direction: "outgoing",
    type: "text",
    status: "read",
    senderName: "Gabriel",
  },
  {
    id: "m7",
    conversationId: "1",
    content: "Amanda, a call de apresentação pode ser às 10am?",
    timestamp: "11/03/2026 09:34",
    direction: "outgoing",
    type: "text",
    status: "read",
    senderName: "Gabriel",
  },
  {
    id: "m8",
    conversationId: "1",
    content: "Atendimento transferido!\nDe Gabriel Veras para: Alessandro Zachi • 11/03/2026 09:36",
    timestamp: "11/03/2026 09:36",
    direction: "incoming",
    type: "transfer",
  },
  {
    id: "m9",
    conversationId: "1",
    content: "Olá bom dia, tudo bem Amanda?",
    timestamp: "11/03/2026 09:50",
    direction: "outgoing",
    type: "text",
    status: "delivered",
    senderName: "Ale",
  },
  {
    id: "m10",
    conversationId: "1",
    content: "Tentei ligar nesse fone que vc está falando comigo, mas o mesmo só da mensagem de desligado.",
    timestamp: "11/03/2026 10:12",
    direction: "outgoing",
    type: "text",
    status: "sent",
    senderName: "Ale",
  },
];
