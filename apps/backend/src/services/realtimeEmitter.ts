/**
 * Realtime Emitter — emits events to frontend via Socket.io
 *
 * Workers call these functions after processing queue jobs.
 * Events are scoped to tenant rooms so only relevant clients receive them.
 *
 * Events:
 *   new_message      → new WhatsApp message received/sent
 *   message_status   → delivery/read status update
 *   ticket_updated   → ticket status changed
 *   expense_created  → AI extracted expense from receipt
 *   campaign_progress → campaign send progress update
 */
import { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  _io = io;
}

function emitToTenant(tenantId: string, event: string, data: any) {
  if (!_io) return;
  _io.to(`tenant:${tenantId}`).emit(event, data);
}

// ── Event Emitters ──

export function emitNewMessage(tenantId: string, message: {
  id: string;
  remoteJid: string;
  direction: string;
  type: string;
  body: string | null;
  status: number;
  instanceName: string;
  createdAt: string;
}) {
  emitToTenant(tenantId, "new_message", message);
}

export function emitMessageStatus(tenantId: string, update: {
  messageId: string;
  status: number; // 0=error, 1=sent, 2=delivered, 3=read
}) {
  emitToTenant(tenantId, "message_status", update);
}

export function emitTicketUpdated(tenantId: string, ticket: {
  id: string;
  status: string;
  title: string;
}) {
  emitToTenant(tenantId, "ticket_updated", ticket);
}

export function emitExpenseCreated(tenantId: string, expense: {
  id: string;
  supplier: string;
  amount: number;
  category: string;
}) {
  emitToTenant(tenantId, "expense_created", expense);
}

export function emitCampaignProgress(tenantId: string, progress: {
  campaignId: string;
  sent: number;
  failed: number;
  total: number;
  status: string;
}) {
  emitToTenant(tenantId, "campaign_progress", progress);
}
