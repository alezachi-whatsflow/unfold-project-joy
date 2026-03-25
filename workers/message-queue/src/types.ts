// ═══════════════════════════════════════════
// Message Job Types
// ═══════════════════════════════════════════

export interface BaseMessageJob {
  tenantId: string;
  instanceToken: string; // uazapi instance token
  provider: "uazapi" | "meta";
  number: string; // recipient (5511999999999)
  messageId?: string; // internal tracking ID
  metadata?: Record<string, unknown>;
}

export interface TextMessageJob extends BaseMessageJob {
  type: "text";
  text: string;
  linkPreview?: boolean;
}

export interface MediaMessageJob extends BaseMessageJob {
  type: "image" | "video" | "audio" | "document" | "ptt";
  file: string; // URL or base64
  text?: string; // caption
  docName?: string;
}

export interface MenuMessageJob extends BaseMessageJob {
  type: "button" | "list" | "poll";
  text: string;
  choices: string[];
  footerText?: string;
  listButton?: string;
}

export interface ContactMessageJob extends BaseMessageJob {
  type: "contact";
  fullName: string;
  phoneNumber: string;
  organization?: string;
}

export type MessageJob = TextMessageJob | MediaMessageJob | MenuMessageJob | ContactMessageJob;

// ── Campaign Job ──────────────────────────────────────────

export interface CampaignJob {
  campaignId: string;
  tenantId: string;
  instanceToken: string;
  provider: "uazapi" | "meta";
  recipients: string[]; // Array of phone numbers
  message: Omit<MessageJob, "number" | "tenantId" | "instanceToken" | "provider">;
  delayMinMs?: number;
  delayMaxMs?: number;
  batchSize?: number;
}

// ── Scheduled Job ─────────────────────────────────────────

export interface ScheduledMessageJob extends MessageJob {
  scheduledFor: string; // ISO 8601 datetime
  scheduleId?: string;
}

// ── DLQ Entry ─────────────────────────────────────────────

export interface DLQEntry {
  originalJob: MessageJob;
  error: string;
  errorCode?: string;
  failedAt: string;
  queue: "transactional" | "scheduled" | "campaign";
  attempts: number;
}

// ── Send Result ───────────────────────────────────────────

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  provider: "uazapi" | "meta";
}
