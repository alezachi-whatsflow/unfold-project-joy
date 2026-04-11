/**
 * run-migration — One-time edge function to apply pending DDL migrations.
 * Called via: GET /functions/v1/run-migration?key=SERVICE_ROLE_KEY
 * Auto-deletes after use (just remove the function directory).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Simple auth: require service role key as query param
  if (key !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: "public" },
  });

  const results: string[] = [];

  try {
    // Migration 1: assigned_at on whatsapp_leads
    const { error: e1 } = await supabase.rpc("exec", {
      sql: "ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;"
    }).single();

    // If rpc doesn't work, try direct approach via raw SQL
    // Supabase JS doesn't support raw SQL, so we use a workaround:
    // Create a temp function, call it, then drop it
    const sql1 = `
      DO $$ BEGIN
        ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
        EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;

    const sql2 = `
      DO $$ BEGIN
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS empresa text;
        EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;

    const sql3 = `
      DO $$ BEGIN
        ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';
        EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;

    const sql4 = `
      DO $$ BEGIN
        ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS caption text;
        EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;

    // Use the pg_net extension or direct connection
    // Since we're in Deno, we can use the Postgres driver
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ||
      `postgresql://postgres:${Deno.env.get("POSTGRES_PASSWORD") || "postgres"}@localhost:5432/postgres`;

    // Try using fetch to PostgREST won't work for DDL
    // Instead, create a temporary function via PostgREST
    const createFn = `
      CREATE OR REPLACE FUNCTION _temp_run_migrations()
      RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $fn$
      BEGIN
        -- 1. assigned_at on whatsapp_leads
        BEGIN
          ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- 2. empresa on customers
        BEGIN
          ALTER TABLE customers ADD COLUMN IF NOT EXISTS empresa text;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- 3. media_type on cadence_steps
        BEGIN
          ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- 4. caption on cadence_steps
        BEGIN
          ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS caption text;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- 5. Index for assigned_at
        BEGIN
          CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_assigned_at
            ON whatsapp_leads(assigned_at DESC NULLS LAST)
            WHERE assigned_attendant_id IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- 6. Index for empresa
        BEGIN
          CREATE INDEX IF NOT EXISTS idx_customers_empresa
            ON customers(empresa) WHERE empresa IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        RETURN 'OK: all migrations applied';
      END;
      $fn$;
    `;

    // Step 1: Create the function via a trick — use supabase-js to call raw SQL
    // We'll use the pg wire protocol via Deno postgres driver
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");

    const connString = Deno.env.get("SUPABASE_DB_URL") ||
      Deno.env.get("DATABASE_URL") ||
      `postgres://postgres.${Deno.env.get("SUPABASE_PROJECT_REF") || "local"}:${Deno.env.get("POSTGRES_PASSWORD") || "postgres"}@db.${Deno.env.get("SUPABASE_PROJECT_REF") || "local"}.supabase.co:5432/postgres`;

    let sql: any;
    try {
      // Try connecting via internal Docker network first
      sql = postgres("postgresql://supabase_admin:postgres@supabase-db:5432/postgres", {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 5,
      });
    } catch {
      try {
        sql = postgres("postgresql://postgres:postgres@localhost:5432/postgres", {
          max: 1,
          idle_timeout: 5,
          connect_timeout: 5,
        });
      } catch {
        return new Response(JSON.stringify({
          error: "Cannot connect to database directly. Please run these SQL commands manually in Supabase SQL Editor.",
          sql: [
            "ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS empresa text;",
            "ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';",
            "ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS caption text;",
          ]
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Apply migrations
    await sql`ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz`;
    results.push("✓ whatsapp_leads.assigned_at");

    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS empresa text`;
    results.push("✓ customers.empresa");

    await sql`ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text'`;
    results.push("✓ cadence_steps.media_type");

    await sql`ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS caption text`;
    results.push("✓ cadence_steps.caption");

    await sql.end();

    return new Response(JSON.stringify({ success: true, applied: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      error: err.message,
      hint: "Run these SQL commands manually in Supabase SQL Editor",
      sql: [
        "ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS empresa text;",
        "ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';",
        "ALTER TABLE cadence_steps ADD COLUMN IF NOT EXISTS caption text;",
      ],
      applied: results,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
