/**
 * API Client — Frontend → Backend Horizontal
 *
 * All heavy operations (send message, create campaign, AI processing)
 * go through the Backend API instead of direct Supabase calls.
 *
 * The JWT from Supabase Auth is passed in every request header.
 * The Backend validates it and creates a scoped Supabase client
 * so RLS still enforces tenant isolation.
 *
 * For read-only queries that don't need processing (listing data),
 * the frontend can still use Supabase directly — RLS protects it.
 */
import { supabase } from "@/integrations/supabase/client";

// Backend URL — configurable via env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

/**
 * Get the current user's JWT token for API calls.
 */
async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

/**
 * Make an authenticated request to the Backend API.
 * Automatically injects the Supabase JWT.
 */
export async function apiCall<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    timeout?: number;
  } = {},
): Promise<T> {
  const { method = "GET", body, timeout = 30000 } = options;
  const token = await getToken();

  // If no backend URL configured, fall back to direct Supabase
  // This allows gradual migration — not all routes need to go through backend yet
  if (!BACKEND_URL) {
    throw new Error("VITE_BACKEND_URL not configured — using direct Supabase");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || err.message || `API error ${res.status}`);
    }

    return res.json();
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("Request timeout");
    throw e;
  }
}

/**
 * Check if Backend API is available.
 * Returns false if VITE_BACKEND_URL is not set (graceful degradation).
 */
export function isBackendAvailable(): boolean {
  return !!BACKEND_URL;
}

// ── Typed API methods ──

export const messagesApi = {
  send: (data: { instanceName: string; recipientJid: string; text: string; isGroup?: boolean }) =>
    apiCall("/api/messages/send", { method: "POST", body: data }),

  sendMedia: (data: { instanceName: string; recipientJid: string; mediaType: string; mediaUrl: string; caption?: string }) =>
    apiCall("/api/messages/send-media", { method: "POST", body: data }),

  getHistory: (jid: string, limit = 50) =>
    apiCall<{ data: any[] }>(`/api/messages/${encodeURIComponent(jid)}?limit=${limit}`),
};

export const campaignsApi = {
  create: (data: { name: string; instanceName: string; numbers: string[]; message?: string; templateId?: string; provider?: string; delayMin?: number; delayMax?: number }) =>
    apiCall<{ accepted: boolean; campaignId: string; estimatedTime: string }>("/api/campaigns", { method: "POST", body: data }),

  list: () =>
    apiCall<{ data: any[] }>("/api/campaigns"),

  control: (id: string, action: "stop" | "continue" | "delete") =>
    apiCall(`/api/campaigns/${id}/control`, { method: "POST", body: { action } }),
};
