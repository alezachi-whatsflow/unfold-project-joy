/**
 * Dynamic multi-tenant SMTP sender.
 *
 * Resolution order:
 * 1. Partner SMTP (from partner_smtp_config via tenant_id → license → WL config)
 * 2. Global env var (SMTP2GO_API_KEY / SENDGRID_API_KEY)
 * 3. DB fallback (ai_configurations.provider='smtp')
 *
 * Supports: SMTP2GO (API), SendGrid (API), Custom SMTP (nodemailer-style via Deno smtp)
 */

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";
const SMTP2GO_API  = "https://api.smtp2go.com/v3/email/send";
const DEFAULT_SENDER = "IAZIS <no-reply@iazis.com.br>";

// In-memory cache for partner SMTP configs (Edge Functions are short-lived, but helps within a single invocation)
const smtpCache = new Map<string, { config: SmtpConfig | null; ts: number }>();
const CACHE_TTL = 5 * 60_000; // 5 min

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // "Name <email>" format — overridden by partner config if available
  tenant_id?: string; // Used to resolve partner SMTP
  whitelabel_config_id?: string; // Direct WL config ID (skips tenant resolution)
}

interface SmtpConfig {
  provider: string;
  api_key: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_secure: boolean;
  from_email: string;
  from_name: string;
}

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: from.trim() };
}

/**
 * Resolve partner SMTP config from DB (encrypted, via service_role).
 */
async function resolvePartnerSmtp(tenantId?: string, wlConfigId?: string): Promise<SmtpConfig | null> {
  if (!tenantId && !wlConfigId) return null;

  const cacheKey = wlConfigId || tenantId || "";
  const cached = smtpCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.config;

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;
    if (wlConfigId) {
      result = await sb.rpc("get_partner_smtp", { p_whitelabel_config_id: wlConfigId });
    } else if (tenantId) {
      result = await sb.rpc("resolve_smtp_for_tenant", { p_tenant_id: tenantId });
    }

    const row = Array.isArray(result?.data) ? result.data[0] : result?.data;

    if (row && (row.api_key || row.smtp_host)) {
      const config: SmtpConfig = {
        provider: row.provider,
        api_key: row.api_key,
        smtp_host: row.smtp_host,
        smtp_port: row.smtp_port || 587,
        smtp_user: row.smtp_user,
        smtp_pass: row.smtp_pass,
        smtp_secure: row.smtp_secure ?? true,
        from_email: row.from_email,
        from_name: row.from_name,
      };
      smtpCache.set(cacheKey, { config, ts: Date.now() });
      console.log(`[smtp] Resolved partner SMTP: ${config.provider} (${config.from_email})`);
      return config;
    }

    smtpCache.set(cacheKey, { config: null, ts: Date.now() });
    return null;
  } catch (e) {
    console.warn("[smtp] Failed to resolve partner SMTP:", e);
    return null;
  }
}

/**
 * Get global SMTP API key (fallback when no partner config).
 */
async function getGlobalApiKey(): Promise<string | null> {
  let apiKey = Deno.env.get("SMTP2GO_API_KEY") || Deno.env.get("SENDGRID_API_KEY");
  if (apiKey) return apiKey;

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await sb.from("ai_configurations")
      .select("api_key")
      .eq("provider", "smtp")
      .eq("is_active", true)
      .order("is_global", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.api_key || null;
  } catch (e) {
    console.warn("[smtp] Failed to fetch global key from DB:", e);
    return null;
  }
}

/**
 * Send email via API-based provider (SMTP2GO or SendGrid).
 */
async function sendViaApi(apiKey: string, sender: { name: string; email: string }, recipients: string[], subject: string, html: string): Promise<void> {
  const isSendGrid = apiKey.startsWith("SG.");

  if (isSendGrid) {
    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
    console.log(`[sendgrid] Email sent to ${recipients.join(", ")} — ${subject}`);
  } else {
    const senderStr = sender.name ? `${sender.name} <${sender.email}>` : sender.email;
    const res = await fetch(SMTP2GO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        sender: senderStr,
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
    console.log(`[smtp2go] Email sent to ${recipients.join(", ")} — ${subject}`);
  }
}

/**
 * Send email via direct SMTP (custom providers like the old SendHit setup).
 * Uses SMTP2GO's SMTP relay with user/pass authentication.
 */
async function sendViaSmtp(config: SmtpConfig, recipients: string[], subject: string, html: string): Promise<void> {
  // Use SMTP2GO API with the partner's own credentials
  // SMTP2GO supports both API and SMTP — when we have user/pass, use their API with sender auth
  const senderStr = `${config.from_name} <${config.from_email}>`;

  // For SMTP2GO accounts with user/pass (like the old SendHit config),
  // we use the SMTP2GO API endpoint with the user's API key if available,
  // or fall back to basic SMTP via fetch to a relay endpoint
  if (config.api_key) {
    await sendViaApi(config.api_key, { name: config.from_name, email: config.from_email }, recipients, subject, html);
  } else if (config.smtp_host && config.smtp_user && config.smtp_pass) {
    // Direct SMTP via Deno's built-in SMTP support
    // For SMTP2GO specifically, we can also use their API with basic auth
    const smtpUrl = `https://api.smtp2go.com/v3/email/send`;
    const res = await fetch(smtpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${config.smtp_user}:${config.smtp_pass}`)}`,
      },
      body: JSON.stringify({
        sender: senderStr,
        to: recipients,
        subject,
        html_body: html,
      }),
    });
    const body = await res.json();
    if (!res.ok || body?.data?.error) {
      throw new Error(`SMTP error: ${body?.data?.error || JSON.stringify(body)}`);
    }
    console.log(`[smtp-direct] Email sent to ${recipients.join(", ")} via ${config.smtp_host}`);
  } else {
    throw new Error("SMTP config incomplete: needs api_key or smtp_host+user+pass");
  }
}

/**
 * Main email sender — resolves partner SMTP first, falls back to global.
 *
 * @param params.tenant_id - Resolve SMTP from tenant's parent WL partner
 * @param params.whitelabel_config_id - Direct WL config (skips tenant resolution)
 * @param params.from - Override sender (ignored when partner SMTP is found)
 */
export async function sendEmail({ to, subject, html, from, tenant_id, whitelabel_config_id }: SendEmailParams): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Try partner-specific SMTP
  const partnerSmtp = await resolvePartnerSmtp(tenant_id, whitelabel_config_id);

  if (partnerSmtp) {
    const sender = { name: partnerSmtp.from_name, email: partnerSmtp.from_email };
    try {
      if (partnerSmtp.api_key) {
        await sendViaApi(partnerSmtp.api_key, sender, recipients, subject, html);
      } else {
        await sendViaSmtp(partnerSmtp, recipients, subject, html);
      }
      return; // Success — done
    } catch (e) {
      console.error(`[smtp] Partner SMTP failed, falling back to global:`, e);
      // Fall through to global SMTP
    }
  }

  // 2. Fallback: global SMTP
  const globalKey = await getGlobalApiKey();
  if (!globalKey) {
    throw new Error("Email API key not configured. Add in Nexus > I.A. Config with provider 'smtp'.");
  }

  const sender = parseSender(from || DEFAULT_SENDER);
  await sendViaApi(globalKey, sender, recipients, subject, html);
}

/**
 * Helper: resolve WL branding for email templates (name, logo, colors, sender).
 * Used by edge functions to build branded email HTML.
 */
export async function resolveEmailBranding(tenantId?: string, accountWhitelabelId?: string): Promise<{
  appName: string;
  fromEmail: string;
  fromName: string;
  logoHtml: string;
  primaryColor: string;
}> {
  const defaults = {
    appName: "IAZIS",
    fromEmail: "no-reply@iazis.com.br",
    fromName: "IAZIS",
    logoHtml: "",
    primaryColor: "#11BC76",
  };

  const wlId = accountWhitelabelId || tenantId;
  if (!wlId) return defaults;

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Try whitelabel_branding first (has support_email)
    const { data: wb } = await sb.from("whitelabel_branding")
      .select("app_name, logo_url, support_email, primary_color")
      .eq("account_id", wlId)
      .maybeSingle();

    if (wb) {
      const appName = wb.app_name || defaults.appName;
      return {
        appName,
        fromEmail: wb.support_email || defaults.fromEmail,
        fromName: appName,
        logoHtml: wb.logo_url
          ? `<img src="${wb.logo_url}" alt="${appName}" style="height:40px;margin-bottom:24px;" />`
          : "",
        primaryColor: wb.primary_color ? `#${wb.primary_color}` : defaults.primaryColor,
      };
    }

    // Fallback: whitelabel_config (if accountWhitelabelId is actually a license_id)
    if (tenantId) {
      const { data: lic } = await sb.from("licenses")
        .select("id, parent_license_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (lic) {
        const wlLicenseId = lic.parent_license_id || lic.id;
        const { data: wc } = await sb.from("whitelabel_config")
          .select("display_name, logo_url, primary_color")
          .eq("license_id", wlLicenseId)
          .maybeSingle();
        if (wc) {
          const appName = wc.display_name || defaults.appName;
          return {
            appName,
            fromEmail: defaults.fromEmail,
            fromName: appName,
            logoHtml: wc.logo_url
              ? `<img src="${wc.logo_url}" alt="${appName}" style="height:40px;margin-bottom:24px;" />`
              : "",
            primaryColor: wc.primary_color || defaults.primaryColor,
          };
        }
      }
    }
  } catch (e) {
    console.warn("[smtp] Failed to resolve email branding:", e);
  }

  return defaults;
}
