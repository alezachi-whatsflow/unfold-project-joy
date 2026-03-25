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
// Queues:
//   msg:transactional → immediate 1:1 sends
//   msg:scheduled     → timed delivery
//   msg:campaign      → mass messaging
// ═══════════════════════════════════════════

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

    const validQueues = ["msg:transactional", "msg:scheduled", "msg:campaign"];
    if (!validQueues.includes(queue)) {
      return json({ error: `Invalid queue. Must be one of: ${validQueues.join(", ")}` }, 400);
    }

    // 3. Connect to appropriate Redis
    const REDIS_PASSWORD = Deno.env.get("REDIS_PASSWORD")!;
    const REDIS_HOST = Deno.env.get("REDIS_IPV6_HOST")!; // 2804:8fbc:0:5::a152

    const portMap: Record<string, number> = {
      "msg:transactional": 16379,
      "msg:scheduled": 16380,
      "msg:campaign": 16381,
    };

    const redis = await connect({
      hostname: REDIS_HOST,
      port: portMap[queue],
      password: REDIS_PASSWORD,
    });

    // 4. Push job to BullMQ queue format
    //    BullMQ uses: XADD queue:name * data <json>
    //    But the simplest compatible approach is RPUSH + job format
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

    // Use BullMQ-compatible XADD to the stream
    await redis.xadd(`bull:${queue}:id`, "*", "data", jobData);

    redis.close();

    return json({ success: true, jobId, queue });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
