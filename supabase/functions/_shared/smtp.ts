/**
 * Shared SMTP2GO email sender for all Edge Functions.
 * API docs: https://apidoc.smtp2go.com/documentation/#/POST/email/send
 */

const SMTP2GO_API = "https://api.smtp2go.com/v3/email/send";
const DEFAULT_SENDER = "Whatsflow <no-reply@whatsflow.com.br>";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // "Name <email>" format
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<void> {
  const apiKey = Deno.env.get("SMTP2GO_API_KEY");
  if (!apiKey) throw new Error("SMTP2GO_API_KEY not configured");

  const recipients = Array.isArray(to) ? to : [to];

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
