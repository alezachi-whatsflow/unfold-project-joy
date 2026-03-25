import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { connect } from "https://deno.land/x/redis@v0.32.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════
// ENQUEUE MESSAGE — Edge Function
//
// Receives message requests from frontend/API
// and pushes them into the Redis BullMQ queues.
//
// Env vars required:
//   REDIS_CORE_HOST, REDIS_SCHEDULE_HOST, REDIS_CAMPAIGN_HOST
//   REDIS_PASSWORD
// ═══════════════════════════════════════════

const QUEUE_MAP: Record<string, { hostEnv: string; portEnv: string }> = {
  "msg:transactional": { hostEnv: "REDIS_CORE_HOST",     portEnv: "REDIS_CORE_PORT" },
  "msg:scheduled":     { hostEnv: "REDIS_SCHEDULE_HOST", portEnv: "REDIS_SCHEDULE_PORT" },
  "msg:campaign":      { hostEnv: "REDIS_CAMPAIGN_HOST", portEnv: "REDIS_CAMPAIGN_PORT" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // 2. Parse body
    const body = await req.json();
    const { queue, job } = body as { queue: string; job: unknown };

    if (!queue || !job) {
      return json({ error: "Missing 'queue' and 'job' fields" }, 400);
    }

    const queueConfig = QUEUE_MAP[queue];
    if (!queueConfig) {
      return json({ error: `Invalid queue. Must be one of: ${Object.keys(QUEUE_MAP).join(", ")}` }, 400);
    }

    // 3. Connect to appropriate Redis via DNS
    const hostname = Deno.env.get(queueConfig.hostEnv)!;
    const port = parseInt(Deno.env.get(queueConfig.portEnv) || "6379");
    const password = Deno.env.get("REDIS_PASSWORD")!;

    const redis = await connect({ hostname, port, password });

    // 4. Push job to BullMQ-compatible format
    const jobId = crypto.randomUUID();
    const jobData = JSON.stringify({
      id: jobId,
      name: queue.split(":")[1],
      data: job,
      opts: {
        attempts: queue === "msg:campaign" ? 2 : 3,
        ...(body.delay ? { delay: body.delay } : {}),
      },
      timestamp: Date.now(),
    });

    await redis.xadd(`bull:${queue}:id`, "*", "data", jobData);
    redis.close();

    return json({ success: true, jobId, queue });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
