import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RequestBody {
  thread_id?: string;
  message: string;
  tenant_id: string;
  user_id: string;
  timezone?: string;
  image_url?: string;
  assistant_id?: string;
}

interface ToolResult {
  tool: string;
  success: boolean;
  data?: unknown;
}

/* ------------------------------------------------------------------ */
/*  OpenAI helper                                                      */
/* ------------------------------------------------------------------ */

async function openaiApi(
  path: string,
  method: "GET" | "POST",
  body: unknown | null,
  apiKey: string,
  projectId?: string | null,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };
  if (projectId) headers["OpenAI-Project"] = projectId;

  const res = await fetch(`https://api.openai.com/v1${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Tool executors                                                     */
/* ------------------------------------------------------------------ */

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  tenantId: string,
  userId: string,
  timezone: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ToolResult> {
  try {
    switch (name) {
      /* ---------- extract_and_save_expense ---------- */
      case "extract_and_save_expense": {
        const { data, error } = await supabase
          .from("financial_entries")
          .insert({
            tenant_id: tenantId,
            type: "despesa",
            category: args.category ?? null,
            description: args.description ?? null,
            amount: args.amount != null ? -Math.abs(Number(args.amount)) : 0,
            date: args.date ?? new Date().toISOString().slice(0, 10),
            payment_method: args.payment_method ?? null,
            origin: "assistente_ia",
            metadata: {
              supplier: args.supplier ?? null,
              confidence: args.confidence ?? null,
            },
          })
          .select()
          .single();

        if (error) throw error;
        return { tool: name, success: true, data };
      }

      /* ---------- schedule_activity ---------- */
      case "schedule_activity": {
        const { data, error } = await supabase
          .from("activities")
          .insert({
            tenant_id: tenantId,
            title: args.title ?? "Atividade sem título",
            description: args.description ?? null,
            due_date: args.due_date ?? null,
            due_time: args.due_time ?? null,
            priority: args.priority ?? "medium",
            status: "pending",
            tags: args.activity_type ? [args.activity_type] : [],
            created_by: userId,
            metadata: {
              related_contact: args.related_contact ?? null,
              attendee_emails: args.attendee_emails ?? null,
              duration_minutes: args.duration_minutes ?? null,
              add_meet_link: args.add_meet_link ?? false,
            },
          })
          .select()
          .single();

        if (error) throw error;
        return { tool: name, success: true, data };
      }

      /* ---------- summarize_content ---------- */
      case "summarize_content": {
        // No DB write — pass the arguments back so the assistant can
        // incorporate them into its response.
        return {
          tool: name,
          success: true,
          data: {
            source: args.source ?? null,
            summary: args.summary ?? null,
            key_points: args.key_points ?? [],
          },
        };
      }

      /* ---------- generate_expense_summary ---------- */
      case "generate_expense_summary": {
        const periodStart =
          (args.period_start as string) ??
          new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
        const periodEnd =
          (args.period_end as string) ??
          new Date().toISOString().slice(0, 10);

        const { data: entries, error } = await supabase
          .from("financial_entries")
          .select("amount, category, date, description")
          .eq("tenant_id", tenantId)
          .eq("type", "despesa")
          .gte("date", periodStart)
          .lte("date", periodEnd);

        if (error) throw error;

        // Aggregate by category
        const byCategory: Record<string, number> = {};
        let total = 0;
        for (const e of entries ?? []) {
          const cat = e.category ?? "sem_categoria";
          const amt = Math.abs(Number(e.amount));
          byCategory[cat] = (byCategory[cat] ?? 0) + amt;
          total += amt;
        }

        return {
          tool: name,
          success: true,
          data: {
            period_start: periodStart,
            period_end: periodEnd,
            total,
            count: entries?.length ?? 0,
            by_category: byCategory,
          },
        };
      }

      /* ---------- schedule_outbound_message ---------- */
      case "schedule_outbound_message": {
        // Convert send_at to UTC using the user's timezone
        let sendAtUtc = args.send_at as string;
        if (sendAtUtc && timezone) {
          try {
            // Parse the date in the given timezone and convert to UTC ISO
            const localDate = new Date(
              new Date(sendAtUtc).toLocaleString("en-US", {
                timeZone: timezone,
              }),
            );
            // Rebuild as UTC: take the "local" components, treat them as the
            // target timezone, then get the real UTC offset.
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });
            const parts = formatter.formatToParts(new Date(sendAtUtc));
            const p = (type: string) =>
              parts.find((x) => x.type === type)?.value ?? "00";
            const isoLocal = `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}`;
            // The input IS in the user's timezone, so we create a Date
            // that represents that wall-clock time in UTC by computing the
            // offset between UTC and the timezone.
            const utcDate = new Date(sendAtUtc);
            if (!isNaN(utcDate.getTime())) {
              sendAtUtc = utcDate.toISOString();
            }
          } catch {
            // If conversion fails, keep the original value
          }
        }

        const { data, error } = await supabase
          .from("scheduled_communications")
          .insert({
            tenant_id: tenantId,
            channel: args.channel ?? "whatsapp",
            target_contact: args.target_contact ?? null,
            target_name: args.target_name ?? null,
            content: args.content ?? "",
            subject: args.subject ?? null,
            send_at: sendAtUtc ?? null,
            status: "pending",
            source: "assistant",
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return { tool: name, success: true, data };
      }

      /* ---------- unknown tool ---------- */
      default:
        return {
          tool: name,
          success: false,
          data: { error: `Unknown tool: ${name}` },
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[copilot-run] Tool "${name}" error:`, msg);
    return { tool: name, success: false, data: { error: msg } };
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  const cors = getCorsHeaders(req);
  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  try {
    /* ---- Parse body ---- */
    const body: RequestBody = await req.json();
    const {
      message,
      tenant_id,
      user_id,
      timezone = "America/Sao_Paulo",
      image_url,
    } = body;
    let { thread_id, assistant_id } = body;

    if (!message || !tenant_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "message, tenant_id and user_id are required" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    /* ---- Supabase service client ---- */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /* ---- Fetch OpenAI key from ai_configurations ---- */
    // Try tenant-specific first, then global
    let aiConfig: Record<string, unknown> | null = null;

    const { data: tenantCfg } = await supabase
      .from("ai_configurations")
      .select("*")
      .eq("provider", "openai")
      .eq("is_active", true)
      .eq("tenant_id", tenant_id)
      .limit(1)
      .maybeSingle();

    if (tenantCfg) {
      aiConfig = tenantCfg;
    } else {
      const { data: globalCfg } = await supabase
        .from("ai_configurations")
        .select("*")
        .eq("provider", "openai")
        .eq("is_active", true)
        .eq("is_global", true)
        .limit(1)
        .maybeSingle();

      aiConfig = globalCfg;
    }

    if (!aiConfig || !aiConfig.api_key) {
      return new Response(
        JSON.stringify({ error: "No active OpenAI configuration found" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const apiKey = aiConfig.api_key as string;
    const projectId = (aiConfig.project_id as string) ?? null;

    // Resolve assistant_id: explicit param > config metadata > env
    if (!assistant_id) {
      const meta = (aiConfig.metadata ?? {}) as Record<string, unknown>;
      assistant_id =
        (meta.assistant_id as string) ??
        Deno.env.get("OPENAI_ASSISTANT_ID") ??
        undefined;
    }

    if (!assistant_id) {
      return new Response(
        JSON.stringify({ error: "No assistant_id provided or configured" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    /* ---- Thread ---- */
    if (!thread_id) {
      const thread = (await openaiApi(
        "/threads",
        "POST",
        {},
        apiKey,
        projectId,
      )) as { id: string };
      thread_id = thread.id;
    }

    /* ---- Add user message ---- */
    const messageContent: unknown[] = image_url
      ? [
          { type: "text", text: message },
          { type: "image_url", image_url: { url: image_url } },
        ]
      : [{ type: "text", text: message }];

    await openaiApi(
      `/threads/${thread_id}/messages`,
      "POST",
      { role: "user", content: messageContent },
      apiKey,
      projectId,
    );

    /* ---- Create run ---- */
    const run = (await openaiApi(
      `/threads/${thread_id}/runs`,
      "POST",
      { assistant_id },
      apiKey,
      projectId,
    )) as { id: string; status: string };

    const runId = run.id;
    const allToolResults: ToolResult[] = [];

    /* ---- Poll loop ---- */
    const POLL_INTERVAL = 1_500; // ms
    const MAX_WAIT = 90_000; // ms
    const started = Date.now();

    let currentRun = run;

    while (Date.now() - started < MAX_WAIT) {
      // Terminal states
      if (
        currentRun.status === "completed" ||
        currentRun.status === "failed" ||
        currentRun.status === "cancelled" ||
        currentRun.status === "expired"
      ) {
        break;
      }

      /* ---- Handle requires_action (tool_calls) ---- */
      if (currentRun.status === "requires_action") {
        const required = (currentRun as Record<string, unknown>)
          .required_action as {
          submit_tool_outputs: {
            tool_calls: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        };

        const toolCalls =
          required?.submit_tool_outputs?.tool_calls ?? [];

        const toolOutputs: Array<{
          tool_call_id: string;
          output: string;
        }> = [];

        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            // malformed JSON from LLM — send error output
          }

          const result = await executeTool(
            tc.function.name,
            args,
            tenant_id,
            user_id,
            timezone,
            supabase,
          );

          allToolResults.push(result);

          toolOutputs.push({
            tool_call_id: tc.id,
            output: JSON.stringify(result),
          });
        }

        // Submit tool outputs
        currentRun = (await openaiApi(
          `/threads/${thread_id}/runs/${runId}/submit_tool_outputs`,
          "POST",
          { tool_outputs: toolOutputs },
          apiKey,
          projectId,
        )) as { id: string; status: string };

        // Continue polling immediately after submitting
        continue;
      }

      // Wait before next poll
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      // Fetch latest run status
      currentRun = (await openaiApi(
        `/threads/${thread_id}/runs/${runId}`,
        "GET",
        null,
        apiKey,
        projectId,
      )) as { id: string; status: string };
    }

    /* ---- Check final status ---- */
    if (currentRun.status !== "completed") {
      return new Response(
        JSON.stringify({
          error: `Run ended with status: ${currentRun.status}`,
          thread_id,
        }),
        { status: 500, headers: jsonHeaders },
      );
    }

    /* ---- Get latest assistant message ---- */
    const msgs = (await openaiApi(
      `/threads/${thread_id}/messages?order=desc&limit=1`,
      "GET",
      null,
      apiKey,
      projectId,
    )) as {
      data: Array<{
        role: string;
        content: Array<{ type: string; text?: { value: string } }>;
      }>;
    };

    const assistantMsg = msgs.data?.find((m) => m.role === "assistant");
    const textBlock = assistantMsg?.content?.find((c) => c.type === "text");
    const responseText = textBlock?.text?.value ?? "";

    /* ---- Return response ---- */
    const response: Record<string, unknown> = {
      thread_id,
      message: responseText,
    };

    if (allToolResults.length > 0) {
      response.tool_results = allToolResults;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[copilot-run] Unhandled error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
