/**
 * Shared AI helper for Edge Functions.
 * Fetches AI config from ai_configurations table and calls the appropriate API.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AIConfig {
  provider: string;
  api_key: string;
  project_id: string | null;
  model: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AICallOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  tenantId?: string;
}

/**
 * Get AI configuration - first checks tenant-specific, then falls back to global.
 */
async function getAIConfig(tenantId?: string): Promise<AIConfig> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, serviceKey);

  // Try tenant-specific first
  if (tenantId) {
    const { data } = await client
      .from("ai_configurations")
      .select("provider, api_key, project_id, model")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback to global
  const { data: global } = await client
    .from("ai_configurations")
    .select("provider, api_key, project_id, model")
    .eq("is_global", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (global) return global;

  throw new Error("Nenhuma configuração de I.A. encontrada. Configure em Nexus > I.A. Config.");
}

/**
 * Call AI API (OpenAI, Anthropic, or Gemini) using config from database.
 */
export async function callAI(options: AICallOptions): Promise<string> {
  const config = await getAIConfig(options.tenantId);

  if (config.provider === "openai") {
    return callOpenAI(config, options);
  } else if (config.provider === "anthropic") {
    return callAnthropic(config, options);
  } else if (config.provider === "gemini") {
    return callGemini(config, options);
  }

  throw new Error(`Provider "${config.provider}" não suportado`);
}

async function callOpenAI(config: AIConfig, options: AICallOptions): Promise<string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${config.api_key}`,
    "Content-Type": "application/json",
  };
  if (config.project_id) {
    headers["OpenAI-Project"] = config.project_id;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(config: AIConfig, options: AICallOptions): Promise<string> {
  const systemMsg = options.messages.find(m => m.role === "system")?.content || "";
  const userMsgs = options.messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.api_key,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      system: systemMsg,
      messages: userMsgs,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGemini(config: AIConfig, options: AICallOptions): Promise<string> {
  const model = config.model || "gemini-2.0-flash";
  const contents = options.messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.max_tokens ?? 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── OPENAI ASSISTANTS API ───────────────────────────────────────────────────

interface AssistantCallOptions {
  assistantId: string;
  message: string;
  tenantId?: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}

/**
 * Call an OpenAI Assistant (Assistants API v2).
 * Creates a thread, sends a message, runs the assistant, polls until complete.
 * The prompt/instructions live in the Assistant config on OpenAI, not here.
 */
export async function callAssistant(options: AssistantCallOptions): Promise<string> {
  const config = await getAIConfig(options.tenantId);
  if (config.provider !== "openai") {
    // Fallback to chat completions for non-OpenAI
    return callAI({ messages: [{ role: "user", content: options.message }], tenantId: options.tenantId });
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${config.api_key}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };
  if (config.project_id) headers["OpenAI-Project"] = config.project_id;

  const api = (path: string, method = "GET", body?: any) =>
    fetch(`https://api.openai.com/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json());

  // 1. Create thread
  const thread = await api("/threads", "POST", {});
  if (!thread.id) throw new Error("Failed to create thread");

  // 2. Add message
  await api(`/threads/${thread.id}/messages`, "POST", {
    role: "user",
    content: options.message,
  });

  // 3. Create run
  const run = await api(`/threads/${thread.id}/runs`, "POST", {
    assistant_id: options.assistantId,
  });
  if (!run.id) throw new Error("Failed to create run");

  // 4. Poll until complete
  const maxWait = options.maxWaitMs ?? 60000;
  const interval = options.pollIntervalMs ?? 2000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, interval));
    const status = await api(`/threads/${thread.id}/runs/${run.id}`);

    if (status.status === "completed") {
      // 5. Get messages
      const msgs = await api(`/threads/${thread.id}/messages?order=desc&limit=1`);
      const assistantMsg = msgs.data?.[0];
      const text = assistantMsg?.content?.[0]?.text?.value ?? "";

      // 6. Cleanup thread
      await api(`/threads/${thread.id}`, "DELETE").catch(() => {});

      return text;
    }

    if (status.status === "failed" || status.status === "cancelled" || status.status === "expired") {
      const errMsg = status.last_error?.message || `Run ${status.status}`;
      throw new Error(`Assistant run failed: ${errMsg}`);
    }
  }

  throw new Error("Assistant run timed out");
}
