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

  // === Extract enriched data ===
  const followers = profile.followersCount || 0;
  const following = profile.followsCount || 0;
  const posts = profile.postsCount || 0;
  const isVerified = profile.verified || false;
  const isBusiness = profile.isBusinessAccount || false;
  const hasBio = !!profile.biography;
  const bioLinks = (profile.externalUrls || profile.bioLinks || []).map((l: any) => typeof l === "string" ? l : l?.url || l?.link || "").filter(Boolean);
  const hasCta = bioLinks.length > 0 || /link|whatsapp|wa\.me|bit\.ly|compre|agende|contato/i.test(profile.biography || "");

  // Recent posts analysis
  const latestPosts = (profile.latestPosts || profile.posts || []).slice(0, 12);
  const recentPosts = latestPosts.map((p: any) => {
    const caption = p.caption || p.text || "";
    const hashtags = caption.match(/#[\w\u00C0-\u024F]+/g) || [];
    return {
      id: p.id || p.shortCode || "",
      type: p.type || (p.videoUrl ? "Video" : p.childPosts ? "Sidecar" : "Image"),
      caption: caption.slice(0, 300),
      likes: p.likesCount || p.likes || 0,
      comments: p.commentsCount || p.comments || 0,
      timestamp: p.timestamp || p.takenAtTimestamp ? new Date((p.takenAtTimestamp || 0) * 1000).toISOString() : "",
      url: p.url || `https://instagram.com/p/${p.shortCode || p.id}`,
      hashtags,
      engagement_rate: followers > 0 ? (((p.likesCount || 0) + (p.commentsCount || 0)) / followers) * 100 : 0,
    };
  });

  // Content mix
  const contentMix = { photos: 0, videos: 0, reels: 0, carousels: 0 };
  for (const p of recentPosts) {
    if (p.type === "Video") contentMix.videos++;
    else if (p.type === "Sidecar") contentMix.carousels++;
    else contentMix.photos++;
  }

  // Top hashtags (frequency)
  const hashtagCount: Record<string, number> = {};
  for (const p of recentPosts) {
    for (const h of p.hashtags) {
      hashtagCount[h] = (hashtagCount[h] || 0) + 1;
    }
  }
  const topHashtags = Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  // Average likes/comments
  const totalLikes = recentPosts.reduce((s: number, p: any) => s + (p.likes || 0), 0);
  const totalComments = recentPosts.reduce((s: number, p: any) => s + (p.comments || 0), 0);
  const avgLikes = recentPosts.length > 0 ? Math.round(totalLikes / recentPosts.length) : 0;
  const avgComments = recentPosts.length > 0 ? Math.round(totalComments / recentPosts.length) : 0;

  // Engagement rate
  const avgEngagement = followers > 0 && recentPosts.length > 0
    ? ((totalLikes + totalComments) / recentPosts.length / followers) * 100
    : (profile.avgEngagement || 0);

  // Posting frequency
  let postingFrequency: string | null = null;
  if (recentPosts.length >= 2) {
    const timestamps = recentPosts.map((p: any) => new Date(p.timestamp).getTime()).filter((t: number) => t > 0).sort();
    if (timestamps.length >= 2) {
      const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);
      if (spanDays > 0) {
        const perWeek = (timestamps.length / spanDays) * 7;
        postingFrequency = `${perWeek.toFixed(1)} posts/semana`;
      }
    }
  }

  // Best performing post
  const bestPost = recentPosts.length > 0
    ? recentPosts.reduce((best: any, p: any) => (p.likes + p.comments) > (best.likes + best.comments) ? p : best, recentPosts[0])
    : null;

  // Authority score (enriched)
  let score = 0;
  if (followers >= 100000) score += 2.5;
  else if (followers >= 10000) score += 2;
  else if (followers >= 1000) score += 1;
  else if (followers >= 500) score += 0.5;
  if (avgEngagement >= 5) score += 2;
  else if (avgEngagement >= 2) score += 1.5;
  else if (avgEngagement >= 1) score += 0.5;
  if (posts >= 200) score += 1;
  else if (posts >= 50) score += 0.5;
  if (isVerified) score += 1.5;
  if (isBusiness) score += 0.5;
  if (hasBio) score += 0.5;
  if (hasCta) score += 1;
  if (contentMix.videos > 0 || contentMix.carousels > 0) score += 0.5;

  // Content strategy analysis
  const strategies: string[] = [];
  if (contentMix.videos === 0 && contentMix.carousels === 0) strategies.push("Sem videos ou carrosseis — oportunidade de diversificar formato");
  if (contentMix.videos > contentMix.photos) strategies.push("Foco em video — bom para alcance organico");
  if (topHashtags.length === 0) strategies.push("Nao utiliza hashtags — oportunidade de aumentar alcance");
  if (topHashtags.length > 5) strategies.push(`Usa hashtags ativamente (top: ${topHashtags.slice(0, 3).join(", ")})`);
  if (!hasCta) strategies.push("Sem CTA na bio — adicionar link de contato/WhatsApp");
  if (hasCta) strategies.push("Tem CTA/link na bio — perfil orientado a conversao");
  if (avgEngagement < 1) strategies.push("Engajamento abaixo de 1% — revisar qualidade do conteudo e horarios");
  if (avgEngagement >= 3) strategies.push("Engajamento forte — audiencia qualificada");
  if (following > followers * 2) strategies.push("Segue mais do que e seguido — possivel mass-following");
  const contentStrategyNotes = strategies.join("\n");

  return {
    success: true,
    username: cleanUsername,
    displayName: profile.fullName || cleanUsername,
    bio: profile.biography || "",
    followers,
    following,
    postsCount: posts,
    avgEngagementRate: avgEngagement,
    authorityScore: Math.min(Math.round(score * 10) / 10, 10),
    profileImageUrl: profile.profilePicUrl || profile.profilePicUrlHD || null,
    isVerified,
    isBusiness,
    businessCategory: profile.businessCategoryName || profile.categoryName || null,
    bioLinks,
    hasCta,
    recentPosts,
    topHashtags,
    contentMix,
    postingFrequency,
    bestPerformingPost: bestPost,
    avgLikes,
    avgComments,
    contentStrategyNotes,
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
