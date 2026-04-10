/**
 * extract-customer-ocr
 * Receives an image (CNPJ card, MEI certificate, business card)
 * Extracts business data via OpenAI Vision and returns structured JSON.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { image_url, image_base64 } = await req.json();
    if (!image_url && !image_base64) {
      return json({ error: "image_url ou image_base64 obrigatório" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OpenAI API key não configurada" }, 500);

    // Build image content for Vision API
    const imageContent = image_base64
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url", image_url: { url: image_url } };

    const prompt = `Analise esta imagem de um documento empresarial brasileiro (cartão CNPJ, certificado MEI, cartão de visitas, ou comprovante de inscrição).

Extraia TODOS os dados visíveis e retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura:

{
  "nome": "Nome/Razão Social da empresa",
  "nome_fantasia": "Nome fantasia (se visível)",
  "cpf_cnpj": "CNPJ ou CPF (só números)",
  "document_type": "CNPJ" ou "CPF" ou "MEI",
  "email": "email (se visível)",
  "telefone": "telefone (se visível)",
  "responsavel": "Nome do responsável/sócio (se visível)",
  "endereco": "Endereço completo (se visível)",
  "cidade": "Cidade",
  "estado": "UF (2 letras)",
  "cep": "CEP (só números)",
  "bairro": "Bairro",
  "segmento": "Atividade econômica / CNAE (se visível)",
  "data_ativacao": "Data de abertura (formato dd/mm/yyyy, se visível)",
  "confidence": 85
}

Campos não encontrados devem ser null. O campo "confidence" é um número de 0-100 indicando sua confiança na extração.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              imageContent,
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[extract-customer-ocr] OpenAI error:", JSON.stringify(data.error));
      return json({ error: data.error?.message || "Erro na extração" }, 500);
    }

    const rawContent = data.choices?.[0]?.message?.content || "";
    console.log(`[extract-customer-ocr] Raw response: ${rawContent.substring(0, 200)}`);

    // Parse JSON from response (handle markdown code blocks)
    let extracted: Record<string, any> = {};
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("[extract-customer-ocr] Failed to parse:", rawContent);
      return json({ error: "Não foi possível extrair dados da imagem", raw: rawContent }, 400);
    }

    console.log(`[extract-customer-ocr] Extracted: ${extracted.nome} (${extracted.cpf_cnpj}), confidence=${extracted.confidence}%`);

    return json({
      success: true,
      data: extracted,
    });
  } catch (err: any) {
    console.error("[extract-customer-ocr] Error:", err);
    return json({ error: err.message }, 500);
  }
});
