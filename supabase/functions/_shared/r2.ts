// ═══════════════════════════════════════════════════════════════
// Cloudflare R2 (S3-compatible) Storage Helper
//
// Env vars:
//   OBJS_ACCESS_KEY_ID      — R2 access key
//   OBJS_SECRET_ACCESS_KEY  — R2 secret key
//   OBJS_ENDPOINT           — https://xxx.r2.cloudflarestorage.com/whatsflow-objects
//   OBJS_PUBLIC_URL         — https://xxx.r2.dev
//
// File paths: {tenantId}/{generatedFilename}
// Public URL:  OBJS_PUBLIC_URL/{tenantId}/{generatedFilename}
// ═══════════════════════════════════════════════════════════════

const encoder = new TextEncoder();

function parseEndpoint(): { endpoint: string; bucket: string } {
  const raw = Deno.env.get("OBJS_ENDPOINT") || "";
  // https://xxx.r2.cloudflarestorage.com/whatsflow-objects
  const url = new URL(raw);
  const parts = url.pathname.split("/").filter(Boolean);
  const bucket = parts[0] || "whatsflow-objects";
  const endpoint = `${url.protocol}//${url.host}`;
  return { endpoint, bucket };
}

// ── AWS Signature V4 (minimal for S3-compatible) ──────────

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, encoder.encode(msg));
}

async function sha256(data: Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signV4(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: Uint8Array | string,
  query = ""
): Promise<Record<string, string>> {
  const accessKey = Deno.env.get("OBJS_ACCESS_KEY_ID")!;
  const secretKey = Deno.env.get("OBJS_SECRET_ACCESS_KEY")!;
  const { endpoint, bucket } = parseEndpoint();
  const host = new URL(endpoint).host;
  const region = "us-east-1";
  const service = "s3";

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.substring(0, 8);

  const payloadHash = await sha256(typeof body === "string" ? body : body);
  headers["host"] = host;
  headers["x-amz-date"] = dateStamp;
  headers["x-amz-content-sha256"] = payloadHash;

  const signedHeaderKeys = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}`)
    .join("\n") + "\n";

  const canonicalRequest = [
    method,
    `/${bucket}${path}`,
    query,
    canonicalHeaders,
    signedHeaderKeys,
    payloadHash,
  ].join("\n");

  const scope = `${shortDate}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", dateStamp, scope, await sha256(canonicalRequest)].join("\n");

  let sigKey = await hmac(encoder.encode(`AWS4${secretKey}`), shortDate);
  sigKey = await hmac(sigKey, region);
  sigKey = await hmac(sigKey, service);
  sigKey = await hmac(sigKey, "aws4_request");

  const sig = [...new Uint8Array(await hmac(sigKey, stringToSign))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaderKeys}, Signature=${sig}`;

  return headers;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/** Upload a file (Uint8Array) to R2 */
export async function uploadToR2(
  tenantId: string,
  filename: string,
  data: Uint8Array,
  contentType = "application/octet-stream"
): Promise<{ key: string; publicUrl: string }> {
  const { endpoint, bucket } = parseEndpoint();
  const key = `${tenantId}/${filename}`;
  const path = `/${encodeURIComponent(key)}`;

  const headers = await signV4("PUT", path, { "content-type": contentType }, data);

  const res = await fetch(`${endpoint}/${bucket}${path}`, {
    method: "PUT",
    headers,
    body: data,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${text}`);
  }

  return { key, publicUrl: getPublicUrl(key) };
}

/** Upload from base64 string */
export async function uploadBase64ToR2(
  tenantId: string,
  filename: string,
  base64Data: string,
  contentType = "application/octet-stream"
): Promise<{ key: string; publicUrl: string }> {
  // Strip data URI prefix if present
  const raw = base64Data.replace(/^data:[^;]+;base64,/, "");
  const binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return uploadToR2(tenantId, filename, binary, contentType);
}

/** Upload from URL (downloads then re-uploads to R2) */
export async function uploadUrlToR2(
  tenantId: string,
  filename: string,
  sourceUrl: string
): Promise<{ key: string; publicUrl: string }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to download from ${sourceUrl}: ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const data = new Uint8Array(await res.arrayBuffer());
  return uploadToR2(tenantId, filename, data, contentType);
}

/** Get a file from R2 (returns ReadableStream) */
export async function getFromR2(key: string): Promise<{ stream: ReadableStream; contentType: string }> {
  const { endpoint, bucket } = parseEndpoint();
  const path = `/${encodeURIComponent(key)}`;
  const headers = await signV4("GET", path, {}, "");

  const res = await fetch(`${endpoint}/${bucket}${path}`, { method: "GET", headers });
  if (!res.ok) throw new Error(`R2 get failed (${res.status})`);

  return {
    stream: res.body!,
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

/** Delete a single file from R2 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const { endpoint, bucket } = parseEndpoint();
  const path = `/${encodeURIComponent(key)}`;
  const headers = await signV4("DELETE", path, {}, "");

  const res = await fetch(`${endpoint}/${bucket}${path}`, { method: "DELETE", headers });
  return res.ok || res.status === 404; // 404 = already gone
}

/** Delete multiple files from R2 (deduplicates keys) */
export async function bulkDeleteFromR2(keys: string[]): Promise<{ deleted: number; errors: number }> {
  // Deduplicate and filter invalid keys
  const validKeys = [...new Set(keys)].filter(
    (k) => k && typeof k === "string" && !k.startsWith("http") && !k.includes("undefined") && !k.includes("null") && !k.includes("error")
  );

  let deleted = 0;
  let errors = 0;

  // R2 supports batch delete via XML, but we'll do sequential for reliability
  for (const key of validKeys) {
    try {
      const ok = await deleteFromR2(key);
      if (ok) deleted++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { deleted, errors };
}

/** Delete all files with a given prefix (tenant cleanup) */
export async function deleteByPrefixFromR2(prefix: string): Promise<{ deleted: number }> {
  const { endpoint, bucket } = parseEndpoint();
  const query = `list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`;
  const headers = await signV4("GET", "/", {}, "", query);

  const res = await fetch(`${endpoint}/${bucket}?${query}`, { method: "GET", headers });
  if (!res.ok) throw new Error(`R2 list failed: ${res.status}`);

  const xml = await res.text();
  // Parse keys from XML response
  const keys: string[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  let match;
  while ((match = keyRegex.exec(xml)) !== null) {
    keys.push(match[1]);
  }

  if (keys.length === 0) return { deleted: 0 };

  const result = await bulkDeleteFromR2(keys);
  return { deleted: result.deleted };
}

/** Build public URL for a key */
export function getPublicUrl(key: string): string {
  const publicBase = Deno.env.get("OBJS_PUBLIC_URL") || "";
  return `${publicBase}/${key}`;
}

/** Extract R2 key from a public URL (inverse of getPublicUrl) */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const publicBase = Deno.env.get("OBJS_PUBLIC_URL") || "";
  if (publicBase && url.startsWith(publicBase)) {
    return url.substring(publicBase.length + 1); // +1 for the /
  }
  return null;
}

/** Generate a unique filename preserving extension */
export function generateFilename(originalName: string): string {
  const ext = (originalName.split(".").pop() || "bin").toLowerCase();
  const safe = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  return `${Date.now()}_${crypto.randomUUID().substring(0, 8)}_${safe}.${ext}`;
}
