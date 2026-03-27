// ═══════════════════════════════════════════════════════════════
// UAZAPI Media Processor — Download, Decrypt, Normalize
//
// Handles: image, video, audio, ptt, document, sticker
// Supports encrypted (mediaKey+directPath) and public URLs
// Normalizes all payload variations (case-insensitive fields)
// ═══════════════════════════════════════════════════════════════

// ── Types ──

export interface MediaData {
  type: "image" | "video" | "audio" | "ptt" | "document" | "sticker";
  url: string | null;
  directPath: string | null;
  mediaKey: string | null;
  fileSha256: string | null;
  fileEncSha256: string | null;
  mediaKeyTimestamp: number | null;
  mimetype: string | null;
  fileLength: number | null;
  jpegThumbnail: string | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  fileName: string | null;
  title: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  seconds: number | null;
  ptt: boolean;
  viewOnce: boolean;
  gifPlayback: boolean;
  isEncrypted: boolean;
  streamType: string;
}

export interface MediaResult {
  success: boolean;
  mediaData: MediaData;
  buffer: Uint8Array | null;
  base64: string | null;
  storagePath: string | null;
  error: string | null;
}

// ── Case-insensitive field extractor ──

function pick(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

// ── Flatten nested payload ──

function flattenPayload(raw: any): any {
  const sources = [
    raw,
    raw?.message,
    raw?.data?.message,
    raw?.data,
    raw?.content,
    raw?.image,
    raw?.video,
    raw?.audio,
    raw?.document,
    raw?.sticker,
    raw?.message?.imageMessage,
    raw?.message?.videoMessage,
    raw?.message?.audioMessage,
    raw?.message?.documentMessage,
    raw?.message?.stickerMessage,
  ].filter(Boolean);

  const merged: any = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      if (v !== undefined && v !== null && merged[k] === undefined) {
        merged[k] = v;
      }
    }
  }
  return merged;
}

// ── Detect media type ──

function detectMediaType(flat: any): MediaData["type"] {
  const mt = String(flat.mimetype || flat.mimeType || "").toLowerCase();
  const mediaType = String(flat.mediaType || flat.messageType || "").toLowerCase();

  // PTT first (special audio)
  if (flat.ptt === true || mediaType.includes("ptt")) return "ptt";

  // Sticker
  if (flat.sticker || flat.stickerMessage || mediaType.includes("sticker")) return "sticker";

  // By mimetype
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("audio/")) return "audio";

  // By mediaType string
  if (mediaType.includes("image")) return "image";
  if (mediaType.includes("video")) return "video";
  if (mediaType.includes("audio")) return "audio";
  if (mediaType.includes("document")) return "document";

  // Default
  return "document";
}

// ── Find media URL ──

function findMediaUrl(flat: any): string | null {
  const candidates = [
    // Direct path URL builders
    flat.directPath?.url,
    flat.DirectPath?.url,
    flat.directPath?.imageUrl,
    flat.directPath?.videoUrl,
    flat.directPath?.audioUrl,
    flat.directPath?.documentUrl,
    flat.directPath?.stickerUrl,
    // Content block
    flat.content?.URL,
    flat.content?.url,
    flat.content?.fileURL,
    flat.content?.fileUrl,
    // Type-specific
    flat.image?.imageUrl,
    flat.video?.videoUrl,
    flat.audio?.audioUrl,
    flat.document?.documentUrl,
    flat.sticker?.stickerUrl,
    // Flat fields
    flat.mediaUrl,
    flat.URL,
    flat.url,
    flat.fileURL,
    flat.fileUrl,
    flat.imageUrl,
    flat.videoUrl,
    flat.audioUrl,
    flat.documentUrl,
    flat.stickerUrl,
  ];

  for (const c of candidates) {
    if (c && typeof c === "string" && c.length > 5) return c;
  }

  return null;
}

// ── Normalize all media data ──

export function normalizeMediaData(rawPayload: any): MediaData {
  const flat = flattenPayload(rawPayload);
  const type = detectMediaType(flat);
  let url = findMediaUrl(flat);

  const directPath = pick(flat, "directPath", "DirectPath");
  const mediaKey = pick(flat, "mediaKey", "MediaKey");

  // Generate URL from directPath if missing
  if (!url && directPath && typeof directPath === "string") {
    url = "https://mmg.whatsapp.net" + directPath;
  }

  const isEncrypted = !!(mediaKey && (directPath || url));

  // Stream type for decryption
  const streamType = type === "ptt" ? "audio" : type;

  // Extract all metadata
  const mimetype = pick(flat, "mimetype", "mimeType") || null;
  const caption = pick(flat, "caption", "text") || null;
  const fileName = pick(flat, "fileName", "FileName") || null;
  const title = pick(flat, "title") || null;

  return {
    type,
    url,
    directPath: typeof directPath === "string" ? directPath : null,
    mediaKey: typeof mediaKey === "string" ? mediaKey : null,
    fileSha256: pick(flat, "fileSha256", "fileSHA256", "FileSHA256") || null,
    fileEncSha256: pick(flat, "fileEncSha256", "fileEncSHA256", "FileEncSHA256") || null,
    mediaKeyTimestamp: pick(flat, "mediaKeyTimestamp", "mediaKeyTimeStamp", "MediaKeyTimestamp") || null,
    mimetype,
    fileLength: pick(flat, "fileLength", "FileLength") || null,
    jpegThumbnail: pick(flat, "jpegThumbnail", "JPEGThumbnail") || null,
    thumbnailWidth: pick(flat, "thumbnailWidth", "ThumbnailWidth") || null,
    thumbnailHeight: pick(flat, "thumbnailHeight", "ThumbnailHeight") || null,
    fileName,
    title,
    caption,
    width: pick(flat, "width") || null,
    height: pick(flat, "height") || null,
    seconds: pick(flat, "seconds") || null,
    ptt: flat.ptt === true,
    viewOnce: flat.viewOnce === true,
    gifPlayback: flat.gifPlayback === true,
    isEncrypted,
    streamType,
  };
}

// ── Generate file name if missing ──

function generateFileName(mediaData: MediaData, messageId: string): string {
  if (mediaData.fileName) return mediaData.fileName;

  const ext = mimeToExtension(mediaData.mimetype || "");
  const prefix = mediaData.type === "ptt" ? "voice" : mediaData.type;
  return `${prefix}_${messageId.substring(0, 12)}${ext}`;
}

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp",
    "video/mp4": ".mp4", "video/quicktime": ".mov",
    "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/webm": ".weba",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/octet-stream": ".bin",
  };
  return map[mime.toLowerCase()] || ".bin";
}

// ── Download media (with decryption support via uazapi) ──

export async function downloadMedia(
  mediaData: MediaData,
  messageId: string,
  instanceToken: string,
  uazapiBaseUrl: string
): Promise<{ buffer: Uint8Array | null; fileName: string; error: string | null }> {
  const fileName = generateFileName(mediaData, messageId);

  // Strategy 1: Use uazapi /message/download endpoint (handles decryption)
  try {
    const res = await fetch(`${uazapiBaseUrl}/message/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({
        id: messageId,
        return_base64: false,
        return_link: true,
        generate_mp3: mediaData.type === "audio" || mediaData.type === "ptt",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const downloadUrl = data.fileURL || data.fileUrl || data.url;

      if (downloadUrl) {
        const fileRes = await fetch(downloadUrl);
        if (fileRes.ok) {
          const contentType = fileRes.headers.get("content-type") || "";
          // Validate: not HTML or JSON (error pages)
          if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
            const buffer = new Uint8Array(await fileRes.arrayBuffer());
            if (buffer.length > 100) { // Sanity check: not an error page
              return { buffer, fileName, error: null };
            }
          }
        }
      }

      // If uazapi returned base64
      if (data.base64Data) {
        const binary = Uint8Array.from(atob(data.base64Data), (c) => c.charCodeAt(0));
        return { buffer: binary, fileName, error: null };
      }
    } else if (res.status === 403 || res.status === 410) {
      return { buffer: null, fileName, error: "ERROR_DOWNLOAD_FILE" };
    }
  } catch (err: any) {
    console.warn("[media-processor] uazapi download failed:", err.message);
  }

  // Strategy 2: Try direct public URL download (fallback)
  if (mediaData.url) {
    // Skip encrypted URLs
    if (mediaData.url.includes("/streamfile/") && mediaData.url.endsWith(".enc")) {
      return { buffer: null, fileName, error: "ERROR_ENCRYPTED_NO_KEY" };
    }
    if (mediaData.url.includes("mmg.whatsapp.net") && mediaData.isEncrypted) {
      return { buffer: null, fileName, error: "ERROR_ENCRYPTED_REQUIRES_DECRYPTION" };
    }

    try {
      const res = await fetch(mediaData.url);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
          const buffer = new Uint8Array(await res.arrayBuffer());
          if (buffer.length > 100) {
            return { buffer, fileName, error: null };
          }
        }
      }
    } catch (err: any) {
      console.warn("[media-processor] Direct download failed:", err.message);
    }
  }

  return { buffer: null, fileName, error: "ERROR_ALL_DOWNLOAD_STRATEGIES_FAILED" };
}

// ── Upload to expense-attachments bucket ──

export async function uploadToExpenseBucket(
  supabase: any,
  tenantId: string,
  fileName: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<{ path: string; publicUrl: string }> {
  const storagePath = `${tenantId}/${Date.now()}_${fileName}`;

  const { error } = await supabase.storage
    .from("expense-attachments")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(`Upload to expense-attachments failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("expense-attachments")
    .getPublicUrl(storagePath);

  return {
    path: storagePath,
    publicUrl: urlData?.publicUrl || "",
  };
}

// ── Full processing pipeline ──

export async function processMedia(
  rawPayload: any,
  messageId: string,
  tenantId: string,
  instanceToken: string,
  uazapiBaseUrl: string,
  uploadFn: (tenantId: string, fileName: string, data: Uint8Array, contentType: string) => Promise<{ key: string; publicUrl: string }>
): Promise<MediaResult> {
  // 1. Normalize
  const mediaData = normalizeMediaData(rawPayload);

  if (!mediaData.url && !mediaData.directPath) {
    return { success: false, mediaData, buffer: null, base64: null, storagePath: null, error: "NO_MEDIA_URL_FOUND" };
  }

  // 2. Download (with decryption via uazapi)
  const { buffer, fileName, error } = await downloadMedia(mediaData, messageId, instanceToken, uazapiBaseUrl);

  if (!buffer || error) {
    return { success: false, mediaData, buffer: null, base64: null, storagePath: null, error: error || "DOWNLOAD_FAILED" };
  }

  // 3. Upload to storage (R2 or Supabase)
  try {
    const contentType = mediaData.mimetype || "application/octet-stream";
    const { key, publicUrl } = await uploadFn(tenantId, fileName, buffer, contentType);

    return {
      success: true,
      mediaData: { ...mediaData, url: publicUrl },
      buffer,
      base64: null, // Don't store base64 in memory
      storagePath: key,
      error: null,
    };
  } catch (uploadErr: any) {
    return {
      success: false,
      mediaData,
      buffer,
      base64: null,
      storagePath: null,
      error: `UPLOAD_FAILED: ${uploadErr.message}`,
    };
  }
}
