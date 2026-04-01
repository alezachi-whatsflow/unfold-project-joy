/**
 * Shared email sender for all Edge Functions.
 * Uses SMTP2GO via their SMTP relay through SendGrid-compatible API,
 * or SendGrid directly — auto-detects by API key format.
 *
 * SendGrid API: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 * SMTP2GO API: https://apidoc.smtp2go.com/documentation/#/POST/email/send
 */

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";
const SMTP2GO_API = "https://api.smtp2go.com/v3/email/send";
const DEFAULT_SENDER = "Whatsflow <no-reply@whatsflow.com.br>";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // "Name <email>" format
}

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: from.trim() };
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<void> {
  let apiKey = Deno.env.get("SMTP2GO_API_KEY") || Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    // Fallback: fetch from ai_configurations
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await sb.from("ai_configurations").select("api_key").eq("provider", "smtp").eq("is_active", true).order("is_global", { ascending: false }).limit(1).maybeSingle();
      if (data?.api_key) apiKey = data.api_key;
    } catch (e) { console.warn("[smtp] Failed to fetch key from DB:", e); }
  }
  if (!apiKey) throw new Error("Email API key not configured. Add in Nexus > I.A. Config with provider 'smtp'.");

  const recipients = Array.isArray(to) ? to : [to];
  const sender = parseSender(from || DEFAULT_SENDER);

  // Detect key format: SendGrid keys start with "SG."
  const isSendGrid = apiKey.startsWith("SG.");

  if (isSendGrid) {
    // SendGrid API
    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients.map(email => ({ email })) }],
        from: { email: sender.email, name: sender.name },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[sendgrid] Send failed:", res.status, errBody);
      throw new Error(`SendGrid error (${res.status}): ${errBody}`);
    }

    console.log(`[sendgrid] Email sent to ${recipients.join(", ")} — subject: ${subject}`);
  } else {
    // SMTP2GO API
    const res = await fetch(SMTP2GO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        sender: from || DEFAULT_SENDER,
        to: recipients,
        subject,
        html_body: html,
      }),
    });

    const body = await res.json();

    if (!res.ok || body?.data?.error) {
      const errMsg = body?.data?.error || body?.data?.error_code || JSON.stringify(body);
      console.error("[smtp2go] Send failed:", errMsg);
      throw new Error(`SMTP2GO error: ${errMsg}`);
    }

    console.log(`[smtp2go] Email sent to ${recipients.join(", ")} — subject: ${subject}`);
  }
}
