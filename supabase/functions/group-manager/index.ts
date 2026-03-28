import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, tenant_id, instance_name } = body;

    if (!tenant_id || !instance_name) return json({ error: "tenant_id and instance_name required" }, 400);

    // Get instance credentials
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url")
      .eq("instance_name", instance_name)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!inst) return json({ error: "Instance not found" }, 404);

    const baseUrl = inst.server_url || Deno.env.get("UAZAPI_BASE_URL") || "";
    const token = inst.instance_token;

    switch (action) {
      case "create": {
        // Create single group
        const { name, participants } = body;
        if (!name) return json({ error: "name required" }, 400);

        const res = await fetch(`${baseUrl}/group/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ name, participants: participants || [] }),
        });
        const data = await res.json();

        if (data.id || data.gid || data.jid) {
          const jid = data.id || data.gid || data.jid;
          // Get invite link
          let inviteLink = "";
          try {
            const linkRes = await fetch(`${baseUrl}/group/invitelink`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token },
              body: JSON.stringify({ groupJid: jid }),
            });
            const linkData = await linkRes.json();
            inviteLink = linkData.link || linkData.inviteLink || linkData.url || "";
          } catch { /* ignore */ }

          // Save to DB
          await supabase.from("whatsapp_groups").upsert({
            tenant_id,
            instance_name,
            jid,
            name,
            invite_link: inviteLink,
            participant_count: (participants || []).length,
            is_admin: true,
            status: "open",
            created_by: user.id,
          }, { onConflict: "tenant_id,jid" });

          return json({ success: true, jid, name, invite_link: inviteLink });
        }
        return json({ error: "Failed to create group", details: data }, 500);
      }

      case "create_batch": {
        // Create multiple groups with prefix + numbering
        const { prefix, count } = body;
        if (!prefix || !count) return json({ error: "prefix and count required" }, 400);
        if (count > 50) return json({ error: "Max 50 groups per batch" }, 400);

        const results: any[] = [];
        for (let i = 1; i <= count; i++) {
          const groupName = `${prefix} - ${String(i).padStart(2, "0")}`;
          try {
            const res = await fetch(`${baseUrl}/group/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token },
              body: JSON.stringify({ name: groupName, participants: [] }),
            });
            const data = await res.json();
            const jid = data.id || data.gid || data.jid;

            let inviteLink = "";
            if (jid) {
              try {
                const linkRes = await fetch(`${baseUrl}/group/invitelink`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", token },
                  body: JSON.stringify({ groupJid: jid }),
                });
                const linkData = await linkRes.json();
                inviteLink = linkData.link || linkData.inviteLink || linkData.url || "";
              } catch { /* ignore */ }

              await supabase.from("whatsapp_groups").upsert({
                tenant_id, instance_name, jid, name: groupName,
                invite_link: inviteLink, is_admin: true, status: "open",
                created_by: user.id, participant_count: 0,
              }, { onConflict: "tenant_id,jid" });
            }

            results.push({ name: groupName, jid, invite_link: inviteLink, success: !!jid });
            // Delay between creations to avoid rate limits
            if (i < count) await new Promise(r => setTimeout(r, 2000));
          } catch (e: any) {
            results.push({ name: groupName, success: false, error: e.message });
          }
        }
        return json({ success: true, created: results.filter(r => r.success).length, total: count, results });
      }

      case "update_settings": {
        const { group_jid, subject, description, locked } = body;
        if (!group_jid) return json({ error: "group_jid required" }, 400);

        if (subject) {
          await fetch(`${baseUrl}/group/subject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ groupJid: group_jid, subject }),
          });
        }
        if (description !== undefined) {
          await fetch(`${baseUrl}/group/description`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ groupJid: group_jid, description }),
          });
        }
        if (locked !== undefined) {
          const setting = locked ? "announcement" : "not_announcement";
          await fetch(`${baseUrl}/group/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ groupJid: group_jid, setting }),
          });
          await supabase.from("whatsapp_groups").update({ is_locked: locked }).eq("jid", group_jid).eq("tenant_id", tenant_id);
        }

        return json({ success: true });
      }

      case "get_invite_link": {
        const { group_jid } = body;
        if (!group_jid) return json({ error: "group_jid required" }, 400);

        const res = await fetch(`${baseUrl}/group/invitelink`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ groupJid: group_jid }),
        });
        const data = await res.json();
        const link = data.link || data.inviteLink || data.url || "";

        if (link) {
          await supabase.from("whatsapp_groups").update({ invite_link: link }).eq("jid", group_jid).eq("tenant_id", tenant_id);
        }
        return json({ link });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("[group-manager] Error:", err);
    return json({ error: err.message }, 500);
  }
});
