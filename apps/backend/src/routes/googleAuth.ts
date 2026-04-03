/**
 * Google Calendar OAuth2 — Connect/Disconnect per Tenant
 *
 * GET  /auth/google          → Redirect to Google consent screen
 * GET  /auth/google/callback  → Exchange code for tokens, save to DB
 * GET  /auth/google/status    → Check connection status
 * POST /auth/google/disconnect → Remove tokens
 *
 * Flow:
 * 1. User clicks "Connect Google Calendar" in Settings
 * 2. Frontend opens /auth/google?jwt=TOKEN
 * 3. Backend redirects to Google OAuth consent
 * 4. User approves → Google redirects to /auth/google/callback
 * 5. Backend exchanges code → saves tokens → redirects to app
 */
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { createServiceClient } from "../config/supabase.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://backend.whatsflow.com.br/auth/google/callback";
const APP_URL = process.env.APP_URL || "https://unfold-project-joy-production.up.railway.app";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

/**
 * GET /auth/google
 * Initiates OAuth2 flow. JWT passed as query param (stored in state).
 */
router.get("/", (req: Request, res: Response) => {
  const jwt = req.query.jwt as string;
  if (!jwt) return res.status(400).json({ error: "JWT required as query param" });

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID." });
  }

  // Encode JWT in state for callback
  const state = Buffer.from(JSON.stringify({ jwt })).toString("base64url");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline"); // Required for refresh_token
  authUrl.searchParams.set("prompt", "consent");       // Force consent to get refresh_token
  authUrl.searchParams.set("state", state);

  res.redirect(authUrl.toString());
});

/**
 * GET /auth/google/callback
 * Exchanges authorization code for access + refresh tokens.
 * Saves to google_calendar_configs with tenant isolation.
 */
router.get("/callback", async (req: Request, res: Response) => {
  const { code, state, error: authError } = req.query;

  if (authError) {
    return res.redirect(`${APP_URL}/app/whatsflow/settings?google_error=${authError}`);
  }

  if (!code || !state) {
    return res.redirect(`${APP_URL}/app/whatsflow/settings?google_error=missing_params`);
  }

  try {
    // 1. Decode JWT from state
    const { jwt } = JSON.parse(Buffer.from(state as string, "base64url").toString());

    // 2. Validate JWT and get user context
    const { createUserClient } = await import("../config/supabase.js");
    const userSupabase = createUserClient(jwt);
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) throw new Error("Invalid JWT");

    // Get tenant
    const { data: tenantLink } = await userSupabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!tenantLink?.tenant_id) throw new Error("No tenant found");

    // 3. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // 4. Get user info (email, name)
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // 5. Save to DB (service client for upsert with tenant_id)
    const serviceSupabase = createServiceClient();
    const { error: dbError } = await serviceSupabase
      .from("google_calendar_configs")
      .upsert({
        tenant_id: tenantLink.tenant_id,
        google_email: userInfo.email,
        google_name: userInfo.name || null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        scopes: SCOPES.split(" "),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,google_email" });

    if (dbError) throw dbError;

    // 6. Redirect back to app with success
    const slug = "whatsflow"; // TODO: resolve from tenant
    res.redirect(`${APP_URL}/app/${slug}/intelligence?tab=ia&google_connected=true`);

  } catch (err: any) {
    console.error("[google-auth] Callback error:", err.message);
    res.redirect(`${APP_URL}/app/whatsflow/settings?google_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /auth/google/status
 * Check if tenant has active Google Calendar connection.
 */
router.get("/status", authMiddleware, async (req: Request, res: Response) => {
  if (!req.supabase) return res.status(500).json({ error: "DB unavailable" });

  const { data } = await req.supabase
    .from("google_calendar_configs")
    .select("google_email, google_name, is_active, last_sync_at, auto_add_meet")
    .eq("is_active", true)
    .maybeSingle();

  res.json({
    connected: !!data,
    email: data?.google_email || null,
    name: data?.google_name || null,
    autoMeet: data?.auto_add_meet ?? true,
  });
});

/**
 * POST /auth/google/disconnect
 * Remove Google Calendar connection for tenant.
 */
router.post("/disconnect", authMiddleware, async (req: Request, res: Response) => {
  if (!req.supabase) return res.status(500).json({ error: "DB unavailable" });

  await req.supabase
    .from("google_calendar_configs")
    .update({ is_active: false, access_token: "", updated_at: new Date().toISOString() })
    .eq("is_active", true);

  res.json({ ok: true, message: "Google Calendar disconnected" });
});

export default router;
