import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getTenantSecret } from "../_shared/env.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * process-audio-input
 * Receives an audio file (multipart/form-data or base64 JSON),
 * transcribes it via OpenAI Whisper, and returns the text.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCors(req);
  }

  const cors = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    let audioBlob: Blob;
    let tenantId: string | undefined;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // --- multipart/form-data path ---
      const formData = await req.formData();
      const audioFile = formData.get("audio");
      if (!audioFile || !(audioFile instanceof Blob)) {
        return new Response(
          JSON.stringify({ error: "Missing 'audio' field in form data" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      audioBlob = audioFile;
      tenantId = formData.get("tenant_id")?.toString() || undefined;
    } else {
      // --- JSON with base64 path ---
      const body = await req.json();
      const { audio_base64, mime_type, tenant_id } = body as {
        audio_base64?: string;
        mime_type?: string;
        tenant_id?: string;
      };

      if (!audio_base64) {
        return new Response(
          JSON.stringify({ error: "Missing 'audio_base64' in request body" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      const binaryString = atob(audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBlob = new Blob([bytes], { type: mime_type ?? "audio/ogg" });
      tenantId = tenant_id;
    }

    // Resolve tenant from JWT if not provided explicitly
    if (!tenantId) {
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
        }
      } catch {
        // best-effort; proceed without tenant scoping
      }
    }

    // Get OpenAI API key
    const openaiKey = await getTenantSecret("OPENAI_API_KEY", "openai", tenantId);
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Build Whisper request
    const whisperForm = new FormData();
    whisperForm.append("file", audioBlob, "audio.ogg");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "pt");
    whisperForm.append("response_format", "verbose_json");

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: whisperForm,
      },
    );

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      console.error("[process-audio-input] Whisper error:", whisperRes.status, errBody);
      return new Response(
        JSON.stringify({ error: "Whisper transcription failed", detail: errBody }),
        { status: whisperRes.status, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const whisperData = await whisperRes.json();

    return new Response(
      JSON.stringify({
        transcription: whisperData.text,
        duration_seconds: whisperData.duration ?? undefined,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[process-audio-input] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
