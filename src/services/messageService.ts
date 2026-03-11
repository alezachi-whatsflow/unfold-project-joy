import { callProxy } from "./instanceService";

// Normalizar número: 5511999999999 sem + ou espaços
export const formatPhone = (phone: string): string =>
  phone.replace(/\D/g, "").replace(/^0/, "").replace(/^(?!55)/, "55");

interface CommonSendFields {
  delay?: number;
  readchat?: boolean;
  readmessages?: boolean;
  replyid?: string;
  mentions?: string;
  forward?: boolean;
  track_source?: string;
  track_id?: string;
  placeholders?: object;
  async?: boolean;
}

export const messageService = {
  // ─── TEXTO ─────────────────────────────────────────────
  sendText: (
    inst: string,
    number: string,
    text: string,
    extra?: CommonSendFields & {
      linkPreview?: boolean;
      linkPreviewTitle?: string;
      linkPreviewDescription?: string;
      linkPreviewImage?: string;
      linkPreviewLarge?: boolean;
    }
  ) =>
    callProxy("/send/text", "POST", {
      number: formatPhone(number),
      text,
      ...extra,
    }, inst),

  // ─── MÍDIA ─────────────────────────────────────────────
  sendMedia: (
    inst: string,
    number: string,
    params: {
      type: "image" | "video" | "document" | "audio" | "myaudio" | "ptt" | "ptv" | "sticker";
      file: string;
      text?: string;
      docName?: string;
    } & CommonSendFields
  ) =>
    callProxy("/send/media", "POST", {
      number: formatPhone(number),
      ...params,
    }, inst),

  // ─── CONTATO ───────────────────────────────────────────
  sendContact: (
    inst: string,
    number: string,
    contact: {
      name: string;
      phone: string;
      organization?: string;
    } & CommonSendFields
  ) =>
    callProxy("/send/contact", "POST", {
      number: formatPhone(number),
      ...contact,
    }, inst),

  // ─── LOCALIZAÇÃO ───────────────────────────────────────
  sendLocation: (
    inst: string,
    number: string,
    lat: number,
    lng: number,
    name?: string,
    extra?: CommonSendFields
  ) =>
    callProxy("/send/location", "POST", {
      number: formatPhone(number),
      latitude: lat,
      longitude: lng,
      name: name ?? "",
      ...extra,
    }, inst),

  // ─── MENUS INTERATIVOS ─────────────────────────────────
  sendMenu: (
    inst: string,
    number: string,
    params: {
      type: "button" | "list" | "poll" | "carousel";
      text: string;
      choices: any[];
      footerText?: string;
      listButton?: string;
      selectableCount?: number;
      headerImage?: string;
    } & CommonSendFields
  ) =>
    callProxy("/send/menu", "POST", {
      number: formatPhone(number),
      ...params,
    }, inst),

  // ─── CARROSSEL ─────────────────────────────────────────
  sendCarousel: (
    inst: string,
    number: string,
    cards: Array<{
      title?: string;
      body?: string;
      footer?: string;
      image?: string;
      buttons?: Array<{ text: string; id?: string }>;
    }>,
    extra?: CommonSendFields
  ) =>
    callProxy("/send/carousel", "POST", {
      number: formatPhone(number),
      cards,
      ...extra,
    }, inst),

  // ─── PIX ───────────────────────────────────────────────
  sendPixButton: (
    inst: string,
    number: string,
    params: {
      pixType: "CPF" | "CNPJ" | "PHONE" | "EMAIL" | "EVP";
      pixKey: string;
      pixName?: string;
    } & CommonSendFields
  ) =>
    callProxy("/send/pix-button", "POST", {
      number: formatPhone(number),
      ...params,
    }, inst),

  // ─── SOLICITAR PAGAMENTO ───────────────────────────────
  sendRequestPayment: (
    inst: string,
    number: string,
    params: {
      value: number;
      description?: string;
      currency?: string;
    } & CommonSendFields
  ) =>
    callProxy("/send/request-payment", "POST", {
      number: formatPhone(number),
      ...params,
    }, inst),

  // ─── PRESENÇA ──────────────────────────────────────────
  sendPresence: (
    inst: string,
    number: string,
    presence: "composing" | "recording" | "paused"
  ) =>
    callProxy("/message/presence", "POST", {
      number: formatPhone(number),
      presence,
    }, inst),

  // ─── GERENCIAR MENSAGENS ───────────────────────────────
  markAsRead: (inst: string, messageId: string, remoteJid: string) =>
    callProxy("/message/markread", "POST", { id: messageId, remoteJid }, inst),

  react: (inst: string, messageId: string, remoteJid: string, emoji: string) =>
    callProxy("/message/react", "POST", { id: messageId, remoteJid, emoji }, inst),

  edit: (inst: string, messageId: string, remoteJid: string, newText: string) =>
    callProxy("/message/edit", "POST", { id: messageId, remoteJid, text: newText }, inst),

  delete: (inst: string, messageId: string, remoteJid: string) =>
    callProxy("/message/delete", "POST", { id: messageId, remoteJid }, inst),

  downloadMedia: (inst: string, messageId: string, remoteJid: string) =>
    callProxy("/message/download", "POST", { id: messageId, remoteJid }, inst),

  find: (inst: string, params: {
    phone?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => callProxy("/message/find", "POST", params, inst),
};
