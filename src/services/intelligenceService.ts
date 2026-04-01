/**
 * Intelligence Service — calls Firecrawl/Apify APIs directly from frontend.
 * Fetches API keys from ai_configurations table (no Edge Functions needed).
 */
import { supabase } from "@/integrations/supabase/client";

let _keyCache: Record<string, { key: string; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getApiKey(provider: string): Promise<string> {
  const cached = _keyCache[provider];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.key;

  const { data, error } = await (supabase as any)
    .from("ai_configurations")
    .select("api_key")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("is_global", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.api_key) {
    throw new Error(`API key para "${provider}" nao configurada. Adicione em Nexus > I.A. Config.`);
  }

  _keyCache[provider] = { key: data.api_key, ts: Date.now() };
  return data.api_key;
}

/* ── Firecrawl: Scrape single URL ── */
export async function scrapeSite(url: string) {
  const apiKey = await getApiKey("firecrawl");

  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: formattedUrl,
      formats: ["markdown", "links"],
      onlyMainContent: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Firecrawl error: ${response.status}`);
  }

  const metadata = data.data?.metadata || data.metadata || {};
  const markdown = data.data?.markdown || data.markdown || "";
  const links = data.data?.links || data.links || [];
  const statusCode = metadata.statusCode || null;

  // Detect error pages
  const contentLower = `${metadata.title || ""} ${metadata.description || ""} ${markdown.substring(0, 500)}`.toLowerCase();
  const isErrorPage =
    (statusCode && statusCode >= 400) ||
    /\b(404|erro 404|page not found|página não encontrada|not found|403|500|502|503)\b/i.test(contentLower);

  if (isErrorPage) {
    return {
      success: false,
      error: `Pagina retornou erro (${statusCode || "nao encontrada"}). Verifique a URL.`,
    };
  }

  return {
    success: true,
    url: formattedUrl,
    title: metadata.title || null,
    description: metadata.description || null,
    keywords: metadata.keywords ? metadata.keywords.split(",").map((k: string) => k.trim()) : null,
    language: metadata.language || null,
    sourceURL: metadata.sourceURL || formattedUrl,
    markdown,
    links,
    ogTitle: metadata.ogTitle || null,
    ogDescription: metadata.ogDescription || null,
    ogImage: metadata.ogImage || null,
  };
}

/* ── Firecrawl: Search + Scrape ── */
export async function searchAndScrape(query: string, options?: { limit?: number; lang?: string; country?: string }) {
  const apiKey = await getApiKey("firecrawl");

  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: options?.limit ?? 5,
      lang: options?.lang ?? "pt-br",
      country: options?.country ?? "br",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Firecrawl search error: ${response.status}`);
  }

  return {
    success: true,
    data: data.data || data.results || [],
  };
}

/* ── Apify: Instagram Scraper ── */
export async function scrapeInstagram(username: string) {
  const apiKey = await getApiKey("apify");
  const cleanUsername = username.replace(/^@/, "");
  const actorId = "apify~instagram-profile-scraper";

  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [cleanUsername],
        resultsLimit: 12,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify Instagram error: ${response.status} — ${errText.substring(0, 200)}`);
  }

  const results = await response.json();
  if (!results || results.length === 0) {
    throw new Error(`Perfil @${cleanUsername} nao encontrado no Instagram.`);
  }

  const profile = results[0];

  // Calculate authority score
  const followers = profile.followersCount || 0;
  const engagement = profile.avgEngagement || 0;
  const posts = profile.postsCount || 0;
  const isVerified = profile.verified || false;
  const hasBio = !!profile.biography;

  let score = 0;
  if (followers >= 100000) score += 3;
  else if (followers >= 10000) score += 2;
  else if (followers >= 1000) score += 1;
  if (engagement >= 5) score += 2;
  else if (engagement >= 2) score += 1;
  if (posts >= 100) score += 1;
  if (isVerified) score += 2;
  if (hasBio) score += 1;

  return {
    success: true,
    username: cleanUsername,
    displayName: profile.fullName || cleanUsername,
    bio: profile.biography || "",
    followers,
    following: profile.followsCount || 0,
    postsCount: posts,
    avgEngagementRate: engagement,
    authorityScore: Math.min(score, 10),
    profileImageUrl: profile.profilePicUrl || null,
    isVerified,
    contentStrategyNotes: null,
    rawData: profile,
  };
}

/* ── Apify: Google Business Scraper ── */
export async function scrapeGoogleBusiness(query: string) {
  const apiKey = await getApiKey("apify");
  const actorId = "nwua9Gu5YrADL7ZDj"; // compass/crawler-google-places

  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: 1,
        language: "pt-BR",
        countryCode: "br",
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify Google Business error: ${response.status} — ${errText.substring(0, 200)}`);
  }

  const results = await response.json();
  if (!results || results.length === 0) {
    throw new Error(`Nenhum resultado encontrado para "${query}".`);
  }

  const place = results[0];

  return {
    success: true,
    name: place.title || place.name || query,
    address: place.address || null,
    phone: place.phone || null,
    website: place.website || null,
    rating: place.totalScore || null,
    reviewsCount: place.reviewsCount || 0,
    category: place.categoryName || null,
    latitude: place.location?.lat || null,
    longitude: place.location?.lng || null,
    photosCount: place.imageUrls?.length || 0,
    description: place.description || null,
    topReviews: (place.reviews || []).slice(0, 5).map((r: any) => ({
      text: r.text || r.textTranslated || "",
      stars: r.stars || 0,
      date: r.publishedAtDate || null,
    })),
    rawData: place,
  };
}
