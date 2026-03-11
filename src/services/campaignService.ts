import { callProxy } from "./instanceService";
import { formatPhone } from "./messageService";

export const campaignService = {
  /**
   * POST /sender/simple
   * Mesma mensagem para múltiplos números.
   */
  createSimple: (
    inst: string,
    params: {
      numbers: string[];
      type: string;
      folder?: string;
      delayMin: number;
      delayMax: number;
      scheduled_for: number;
      info?: string;
      text?: string;
      file?: string;
      caption?: string;
      [key: string]: any;
    }
  ) =>
    callProxy("/sender/simple", "POST", {
      ...params,
      numbers: params.numbers.map((n) =>
        n.includes("@") ? n : `${formatPhone(n)}@s.whatsapp.net`
      ),
    }, inst),

  /**
   * POST /sender/advanced
   * Mensagem personalizada por contato.
   */
  createAdvanced: (
    inst: string,
    params: {
      delayMin: number;
      delayMax: number;
      scheduled_for: number;
      info?: string;
      messages: Array<{
        number: string;
        type: string;
        text?: string;
        file?: string;
        placeholders?: Record<string, string>;
        [key: string]: any;
      }>;
    }
  ) =>
    callProxy("/sender/advanced", "POST", {
      ...params,
      messages: params.messages.map((m) => ({
        ...m,
        number: m.number.includes("@") ? m.number : formatPhone(m.number),
      })),
    }, inst),

  /**
   * POST /sender/edit
   * Controlar uma campanha existente.
   */
  control: (inst: string, folderId: string, action: "stop" | "continue" | "delete") =>
    callProxy("/sender/edit", "POST", { folder_id: folderId, action }, inst),

  /** GET /sender/listfolders */
  listFolders: (inst: string) =>
    callProxy("/sender/listfolders", "GET", undefined, inst),

  /** POST /sender/listmessages */
  listMessages: (
    inst: string,
    folderId: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ) =>
    callProxy("/sender/listmessages", "POST", { folder_id: folderId, ...params }, inst),

  /** POST /sender/cleardone */
  clearDone: (inst: string) =>
    callProxy("/sender/cleardone", "POST", {}, inst),

  /** DELETE /sender/clearall */
  clearAll: (inst: string) =>
    callProxy("/sender/clearall", "DELETE", undefined, inst),
};
