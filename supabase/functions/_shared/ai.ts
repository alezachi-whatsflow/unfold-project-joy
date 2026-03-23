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
