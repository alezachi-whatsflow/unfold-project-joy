/**
 * JWT Authentication Middleware
 *
 * Extracts the JWT from Authorization header and creates
 * a Supabase client scoped to the user's RLS context.
 *
 * RULE: Never expose Service Role to client-facing routes.
 */
import { Request, Response, NextFunction } from "express";
import { createUserClient } from "../config/supabase.js";

declare global {
  namespace Express {
    interface Request {
      jwt?: string;
      userId?: string;
      tenantId?: string;
      supabase?: ReturnType<typeof createUserClient>;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const jwt = authHeader.slice(7);
  const supabase = createUserClient(jwt);

  // Validate token by getting user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Resolve tenant
  const { data: tenantLink } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  req.jwt = jwt;
  req.userId = user.id;
  req.tenantId = tenantLink?.tenant_id || undefined;
  req.supabase = supabase;

  next();
}
