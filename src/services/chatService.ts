import { callProxy } from "./instanceService";
import { formatPhone } from "./messageService";

export const chatService = {
  // POST /chat/check — Verifica múltiplos números no WhatsApp
  checkNumbers: (inst: string, numbers: string[]) =>
    callProxy("/chat/check", "POST", {
      numbers: numbers.map(formatPhone),
    }, inst),

  // POST /chat/find — Busca chats com filtros avançados
  find: (inst: string, params?: {
    operator?: "AND" | "OR";
    sort?: string;
    limit?: number;
    offset?: number;
    wa_isGroup?: boolean;
    wa_archived?: boolean;
    wa_isPinned?: boolean;
    wa_isBlocked?: boolean;
    wa_label?: string;
    wa_contactName?: string;
    lead_isTicketOpen?: boolean;
    lead_status?: string;
    lead_tags?: string;
    lead_assignedAttendant_id?: string;
  }) =>
    callProxy("/chat/find", "POST", params ?? { sort: "-wa_lastMsgTimestamp", limit: 20 }, inst),

  // POST /chat/details
  details: (inst: string, chatId: string) =>
    callProxy("/chat/details", "POST", { id: chatId }, inst),

  // POST /chat/editLead — CRM embutido
  editLead: (inst: string, chatId: string, params: {
    chatbot_disableUntil?: number;
    lead_isTicketOpen?: boolean;
    lead_assignedAttendant_id?: string;
    lead_kanbanOrder?: number;
    lead_tags?: string[];
    lead_name?: string;
    lead_fullName?: string;
    lead_status?: string;
    [key: string]: any;
  }) =>
    callProxy("/chat/editLead", "POST", { id: chatId, ...params }, inst),

  // POST /chat/labels
  manageLabels: (inst: string, number: string, params: {
    labelids?: string[];
    add_labelid?: string;
    remove_labelid?: string;
  }) =>
    callProxy("/chat/labels", "POST", { number: formatPhone(number), ...params }, inst),

  // POST /chat/archive
  archive: (inst: string, chatId: string, archive = true) =>
    callProxy("/chat/archive", "POST", { id: chatId, archive }, inst),

  // POST /chat/read
  markRead: (inst: string, chatId: string) =>
    callProxy("/chat/read", "POST", { id: chatId }, inst),

  // POST /chat/mute
  mute: (inst: string, chatId: string, muteEndTime?: number) =>
    callProxy("/chat/mute", "POST", { id: chatId, muteEndTime }, inst),

  // POST /chat/pin
  pin: (inst: string, chatId: string, pin = true) =>
    callProxy("/chat/pin", "POST", { id: chatId, pin }, inst),

  // POST /chat/delete
  deleteChat: (inst: string, chatId: string) =>
    callProxy("/chat/delete", "POST", { id: chatId }, inst),

  // POST /chat/block + GET /chat/blocklist
  block: (inst: string, number: string, block = true) =>
    callProxy("/chat/block", "POST", { number: formatPhone(number), block }, inst),

  getBlockList: (inst: string) =>
    callProxy("/chat/blocklist", "GET", undefined, inst),
};

// ─── Contatos ─────────────────────────────────────────────
export const contactService = {
  list: (inst: string, page = 1, pageSize = 100) =>
    callProxy("/contacts/list", "POST", { page, pageSize }, inst),

  listAll: (inst: string) =>
    callProxy("/contacts", "GET", undefined, inst),

  add: (inst: string, phone: string, name: string) =>
    callProxy("/contact/add", "POST", { phone: formatPhone(phone), name }, inst),

  remove: (inst: string, phone: string) =>
    callProxy("/contact/remove", "POST", { phone: formatPhone(phone) }, inst),
};

// ─── Labels ───────────────────────────────────────────────
export const labelService = {
  list: (inst: string) =>
    callProxy("/labels", "GET", undefined, inst),

  edit: (inst: string, params: {
    id?: string;
    delete?: boolean;
    name?: string;
    color?: string;
  }) =>
    callProxy("/label/edit", "POST", params, inst),
};

// ─── Respostas Rápidas ───────────────────────────────────
export const quickReplyService = {
  listAll: (inst: string) =>
    callProxy("/quickreply/showall", "GET", undefined, inst),

  edit: (inst: string, params: {
    id?: string;
    delete?: boolean;
    shortCut: string;
    type: "text" | "audio" | "myaudio" | "ptt" | "document" | "video" | "image";
    text?: string;
    file?: string;
  }) =>
    callProxy("/quickreply/edit", "POST", params, inst),
};
