import type { ChannelType } from "@/components/ui/ChannelIcon";

export interface Conversation {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType: "text" | "audio" | "image" | "document" | "system";
  unreadCount: number;
  isOnline: boolean;
  avatarColor: string;
  avatarInitials: string;
  avatarUrl?: string;
  instanceName: string;
  channel?: ChannelType;
  tags: Array<{
    label: string;
    color: "ai" | "client" | "lead" | "support" | "transfer";
  }>;
  isTicketOpen: boolean;
  assignedTo?: string;
  status: "open" | "pending" | "resolved" | "transferred";
  isGroup?: boolean;
  participantCount?: number;
  /** SLA breach: true if first response or resolution time exceeded */
  slaBreach?: boolean;
}

export const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Amanda - Frente Comunicações",
    phone: "5511997001234",
    lastMessage: "Tentei ligar nesse fone que vc está falando comigo, m...",
    lastMessageTime: "10:12",
    lastMessageType: "text",
    unreadCount: 0,
    isOnline: false,
    avatarColor: "#7C3AED",
    avatarInitials: "AF",
    instanceName: "whatsflow-principal",
    tags: [
      { label: "IA SDR DANI", color: "ai" },
      { label: "CLIENTE FINAL", color: "client" },
      { label: "QUALIFICAÇÃO", color: "lead" },
    ],
    isTicketOpen: true,
    assignedTo: "Alessandro Zachi",
    status: "open",
  },
  {
    id: "2",
    name: "5549938080856",
    phone: "5549938080856",
    lastMessage: "Atenção ⚠️ A Whatsflow não realiza o serviço de...",
    lastMessageTime: "10:17",
    lastMessageType: "text",
    unreadCount: 1,
    isOnline: true,
    avatarColor: "#0EA5E9",
    avatarInitials: "54",
    instanceName: "whatsflow-principal",
    tags: [],
    isTicketOpen: true,
    status: "open",
  },
  {
    id: "3",
    name: "Alessandro Zachi",
    phone: "5543999991111",
    lastMessage: "Atendimento transferido.",
    lastMessageTime: "Ontem",
    lastMessageType: "system",
    unreadCount: 0,
    isOnline: false,
    avatarColor: "#00A884",
    avatarInitials: "AZ",
    instanceName: "whatsflow-principal",
    tags: [{ label: "SUPORTE", color: "support" }],
    isTicketOpen: false,
    assignedTo: "Gabriel Veras",
    status: "transferred",
  },
  {
    id: "4",
    name: "Lucas Wellerson",
    phone: "5511988887777",
    lastMessage: "Sessão finalizada! N/A",
    lastMessageTime: "Ontem",
    lastMessageType: "system",
    unreadCount: 0,
    isOnline: false,
    avatarColor: "#F59E0B",
    avatarInitials: "LW",
    instanceName: "whatsflow-principal",
    tags: [],
    isTicketOpen: false,
    status: "resolved",
  },
  {
    id: "5",
    name: "Fellipe Proença (Balança Açores)",
    phone: "5511977776666",
    lastMessage: "📎 Documento",
    lastMessageTime: "Ontem",
    lastMessageType: "document",
    unreadCount: 0,
    isOnline: false,
    avatarColor: "#EF4444",
    avatarInitials: "FP",
    instanceName: "whatsflow-principal",
    tags: [{ label: "LEAD", color: "lead" }],
    isTicketOpen: true,
    status: "pending",
  },
];
