import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
  if (!APIFY_API_KEY) {
    // Fallback: fetch from ai_configurations table
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await sb.from("ai_configurations").select("api_key").eq("provider", "apify").eq("is_active", true).order("is_global", { ascending: false }).limit(1).maybeSingle();
      if (data?.api_key) APIFY_API_KEY = data.api_key;
    } catch (e) { console.warn("Failed to fetch Apify key from DB:", e); }
  }
  if (!APIFY_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Apify not configured. Add key in Nexus > I.A. Config with provider "apify".' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase env vars not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { username } = await req.json();
    if (!username) {
      return new Response(
        JSON.stringify({ error: "username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanUsername = username.replace(/^@/, "").trim();

    // Step 1: Start Apify Instagram Profile Scraper actor run
    const actorId = "apify~instagram-profile-scraper";
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [cleanUsername],
          resultsLimit: 1,
        }),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      console.error("Apify API error:", errText);
      return new Response(
        JSON.stringify({ error: `Apify API failed [${runResponse.status}]`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apifyResults = await runResponse.json();
    const profileData = Array.isArray(apifyResults) ? apifyResults[0] : null;

    if (!profileData) {
      return new Response(
        JSON.stringify({ error: "No profile data returned from Apify" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Map Apify data to our ProfileAnalysis schema
    const followers = profileData.followersCount ?? profileData.followers ?? 0;
    const following = profileData.followsCount ?? profileData.following ?? 0;
    const postsCount = profileData.postsCount ?? profileData.posts ?? 0;

    // Calculate engagement rate from recent posts if available
    let avgEngagementRate: number | null = null;
    if (profileData.latestPosts && Array.isArray(profileData.latestPosts) && profileData.latestPosts.length > 0 && followers > 0) {
      const totalEngagement = profileData.latestPosts.reduce((sum: number, post: any) => {
        return sum + (post.likesCount || 0) + (post.commentsCount || 0);
      }, 0);
      avgEngagementRate = Math.round((totalEngagement / profileData.latestPosts.length / followers) * 100 * 100) / 100;
    }

    // Calculate authority score (0-10) based on multiple factors
    let authorityScore = 0;
    // Followers weight (max 3 points)
    if (followers >= 1_000_000) authorityScore += 3;
    else if (followers >= 100_000) authorityScore += 2.5;
    else if (followers >= 10_000) authorityScore += 2;
    else if (followers >= 1_000) authorityScore += 1;
    else authorityScore += 0.5;

    // Engagement weight (max 3 points)
    if (avgEngagementRate !== null) {
      if (avgEngagementRate >= 5) authorityScore += 3;
      else if (avgEngagementRate >= 3) authorityScore += 2;
      else if (avgEngagementRate >= 1) authorityScore += 1;
      else authorityScore += 0.5;
    }

    // Content consistency (max 2 points)
    if (postsCount >= 500) authorityScore += 2;
    else if (postsCount >= 100) authorityScore += 1.5;
    else if (postsCount >= 30) authorityScore += 1;
    else authorityScore += 0.5;

    // Verified badge (max 1 point)
    if (profileData.verified) authorityScore += 1;

    // Bio presence (max 1 point)
    if (profileData.biography && profileData.biography.length > 20) authorityScore += 1;
    else if (profileData.biography) authorityScore += 0.5;

    authorityScore = Math.min(Math.round(authorityScore * 10) / 10, 10);

    // Build content strategy notes
    const strategyNotes: string[] = [];
    if (postsCount > 0 && profileData.latestPosts?.length > 0) {
      const posts = profileData.latestPosts;
      const videoCount = posts.filter((p: any) => p.type === "Video" || p.videoUrl).length;
      const imageCount = posts.filter((p: any) => p.type === "Image" || p.type === "Sidecar").length;
      const totalPosts = posts.length;

      if (videoCount > totalPosts * 0.5) {
        strategyNotes.push("Estratégia focada em vídeos/Reels — forte presença em conteúdo dinâmico.");
      } else if (imageCount > totalPosts * 0.5) {
        strategyNotes.push("Conteúdo predominantemente visual com foco em imagens e carrosséis.");
      } else {
        strategyNotes.push("Mix equilibrado entre vídeos e imagens.");
      }

      // Average caption length
      const avgCaptionLen = posts.reduce((s: number, p: any) => s + (p.caption?.length || 0), 0) / totalPosts;
      if (avgCaptionLen > 300) {
        strategyNotes.push("Legendas longas e educativas — posicionamento como autoridade.");
      } else if (avgCaptionLen > 100) {
        strategyNotes.push("Legendas de tamanho médio, mix entre engajamento e informação.");
      } else {
        strategyNotes.push("Legendas curtas — foco no visual como principal comunicação.");
      }

      // Hashtag usage
      const avgHashtags = posts.reduce((s: number, p: any) => {
        const matches = (p.caption || "").match(/#\w+/g);
        return s + (matches ? matches.length : 0);
      }, 0) / totalPosts;
      if (avgHashtags > 10) {
        strategyNotes.push(`Uso intenso de hashtags (~${Math.round(avgHashtags)} por post) — estratégia de alcance.`);
      } else if (avgHashtags > 3) {
        strategyNotes.push(`Uso moderado de hashtags (~${Math.round(avgHashtags)} por post).`);
      }
    }

    if (profileData.externalUrl) {
      strategyNotes.push(`Link na bio ativo: ${profileData.externalUrl}`);
    }

    const profile = {
      source: "instagram" as const,
      username: cleanUsername,
      display_name: profileData.fullName || profileData.name || cleanUsername,
      bio: profileData.biography || profileData.bio || null,
      followers,
      following,
      posts_count: postsCount,
      avg_engagement_rate: avgEngagementRate,
      profile_url: `https://instagram.com/${cleanUsername}`,
      profile_image_url: profileData.profilePicUrl || profileData.profilePicUrlHD || null,
      content_strategy_notes: strategyNotes.length > 0 ? "• " + strategyNotes.join("\n• ") : null,
      authority_score: authorityScore,
      status: "completed" as const,
    };

    // Step 3: Persist to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: saved, error: dbError } = await supabase
      .from("profiles_analysis")
      .insert(profile)
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Return the profile even if DB fails
      return new Response(
        JSON.stringify({ profile: { id: crypto.randomUUID(), ...profile, analyzed_at: new Date().toISOString() }, warning: "Failed to persist" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ profile: saved }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
