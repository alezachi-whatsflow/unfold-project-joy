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
  content: string | VisionContent[];
}

interface VisionContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "low" | "high" | "auto" };
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

// ─── VISION API (Image Analysis) ─────────────────────────────────────────────

interface VisionCallOptions {
  imageUrl: string;
  systemPrompt: string;
  userPrompt?: string;
  temperature?: number;
  max_tokens?: number;
  tenantId?: string;
}

/**
 * Call AI Vision API — sends an image URL for analysis.
 * Automatically adapts to the configured provider (OpenAI, Anthropic, Gemini).
 */
export async function callVision(options: VisionCallOptions): Promise<string> {
  const config = await getAIConfig(options.tenantId);

  // Override model to vision-capable variant if needed
  const visionModel = resolveVisionModel(config.provider, config.model);

  if (config.provider === "openai") {
    return callOpenAIVision({ ...config, model: visionModel }, options);
  } else if (config.provider === "anthropic") {
    return callAnthropicVision({ ...config, model: visionModel }, options);
  } else if (config.provider === "gemini") {
    return callGeminiVision({ ...config, model: visionModel }, options);
  }

  throw new Error(`Provider "${config.provider}" não suporta Vision`);
}

function resolveVisionModel(provider: string, currentModel: string): string {
  // Ensure model supports vision; upgrade if necessary
  const visionModels: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-20250514",
    gemini: "gemini-2.0-flash",
  };
  // If current model already supports vision, keep it
  const knownVision = [
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
    "claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-opus-4-20250514",
    "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash",
  ];
  if (knownVision.some((m) => currentModel.includes(m))) return currentModel;
  return visionModels[provider] || currentModel;
}

async function callOpenAIVision(config: AIConfig, options: VisionCallOptions): Promise<string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${config.api_key}`,
    "Content-Type": "application/json",
  };
  if (config.project_id) headers["OpenAI-Project"] = config.project_id;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        {
          role: "user",
          content: [
            ...(options.userPrompt ? [{ type: "text", text: options.userPrompt }] : []),
            { type: "image_url", image_url: { url: options.imageUrl, detail: "high" } },
          ],
        },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Vision error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropicVision(config: AIConfig, options: VisionCallOptions): Promise<string> {
  // Anthropic requires base64 or URL with media_type
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.api_key,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      system: options.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            ...(options.userPrompt ? [{ type: "text", text: options.userPrompt }] : []),
            {
              type: "image",
              source: { type: "url", url: options.imageUrl },
            },
          ],
        },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic Vision error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGeminiVision(config: AIConfig, options: VisionCallOptions): Promise<string> {
  const model = config.model;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${options.systemPrompt}\n\n${options.userPrompt || "Analise esta imagem."}` },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: "", // Gemini prefers inline_data; fallback to fileUri
                },
                file_data: {
                  mime_type: "image/jpeg",
                  file_uri: options.imageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          maxOutputTokens: options.max_tokens ?? 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Vision error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── EXPENSE DATA EXTRACTION ─────────────────────────────────────────────────

export interface ExtractedExpense {
  supplier: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  confidence: number; // 0-1
}

const EXPENSE_SYSTEM_PROMPT = `Você é um extrator financeiro Pzaafi. Analise a imagem do recibo/nota fiscal/comprovante. Extraia os seguintes campos:
- supplier: nome do fornecedor/estabelecimento
- amount: valor numérico total (apenas o número, sem R$ ou pontos de milhar; use ponto como separador decimal)
- date: data da transação no formato YYYY-MM-DD
- category: sugira uma categoria (ex: Alimentação, Transporte, Material de Escritório, Tecnologia, Serviços, Impostos, Outros)
- description: descrição breve do que foi comprado/pago
- confidence: sua confiança na extração de 0 a 1

Retorne APENAS um JSON válido, sem markdown, sem explicações, sem código de bloco. Apenas o objeto JSON puro.
Se não conseguir extrair algum campo, use null para strings e 0 para números.`;

/**
 * Extract structured expense data from a receipt/invoice image.
 */
export async function extractExpenseData(
  imageUrl: string,
  textContext?: string,
  tenantId?: string,
): Promise<ExtractedExpense> {
  const userPrompt = textContext
    ? `Contexto adicional do remetente: "${textContext}". Analise o recibo/nota na imagem.`
    : "Analise o recibo/nota fiscal na imagem.";

  const raw = await callVision({
    imageUrl,
    systemPrompt: EXPENSE_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.1,
    max_tokens: 512,
    tenantId,
  });

  // Parse JSON — strip markdown fences if AI wrapped it
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      supplier: parsed.supplier || "Não identificado",
      amount: typeof parsed.amount === "number" ? parsed.amount : parseFloat(parsed.amount) || 0,
      date: parsed.date || new Date().toISOString().split("T")[0],
      category: parsed.category || "Outros",
      description: parsed.description || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch {
    console.error("[ai] Failed to parse expense JSON:", cleaned);
    throw new Error("Falha ao interpretar dados do recibo. Resposta da IA inválida.");
  }
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
