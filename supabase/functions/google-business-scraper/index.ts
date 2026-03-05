import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "O campo 'query' (nome do negócio + cidade) é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "APIFY_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting Google Maps scraper for query:", query);

    // Run Apify Google Maps Scraper actor synchronously
    const actorId = "nwua9Gu5YrADL7ZDj"; // compass/crawler-google-places
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`;

    const response = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: 1,
        language: "pt-BR",
        maxReviews: 5,
        includeWebResults: false,
        onlyDataFromSearchPage: false,
        scrapeProductInfo: true,
        scrapeUpdates: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Apify error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na API do Apify: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await response.json();
    console.log("Apify returned", results.length, "results");

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum resultado encontrado para essa busca." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place = results[0];

    // Map to our BusinessLead structure
    const businessData = {
      name: place.title || place.searchString || query,
      address: place.address || place.street || null,
      phone: place.phone || null,
      website: place.website || place.url || null,
      rating: place.totalScore ?? place.rating ?? null,
      reviews_count: place.reviewsCount ?? place.reviews ?? null,
      category: place.categoryName || place.category || null,
      latitude: place.location?.lat ?? null,
      longitude: place.location?.lng ?? null,
      place_id: place.placeId || null,
      // Extra fields for analysis
      opening_hours: place.openingHours || null,
      photos_count: place.imageUrls?.length ?? place.photosCount ?? 0,
      description: place.description || place.additionalInfo?.["Sobre"] || null,
      claimed: place.isAdvertising ?? null,
      reviews_distribution: place.reviewsDistribution || null,
      top_reviews: (place.reviews || []).slice(0, 5).map((r: any) => ({
        text: r.text || r.textTranslated || "",
        stars: r.stars,
        publishedAtDate: r.publishedAtDate,
      })),
      image_url: place.imageUrls?.[0] || place.imageUrl || null,
      maps_url: place.url || `https://www.google.com/maps/place/?q=${encodeURIComponent(query)}`,
      // Products / Services
      products: (place.orderBy || place.products || []).map((p: any) => ({
        name: p.title || p.name || "",
        category: p.category || p.subtitle || "",
        price: p.price || null,
        image_url: p.imageUrl || p.thumbnailUrl || null,
      })),
      // Posts / Feed updates
      posts: (place.updatesFromCustomers || place.posts || place.updates || []).slice(0, 5).map((u: any) => ({
        text: u.text || u.body || "",
        date: u.publishedAt || u.publishedAtDate || u.date || null,
        image_url: u.imageUrl || u.thumbnailUrl || null,
      })),
      has_products: !!(place.orderBy?.length || place.products?.length),
      has_recent_posts: !!(place.updatesFromCustomers?.length || place.posts?.length || place.updates?.length),
      social_profiles: place.socialProfiles || place.additionalInfo?.["Perfis"] || null,
    };

    // Persist to business_leads table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: savedLead, error: dbError } = await supabase
      .from("business_leads")
      .insert({
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        website: businessData.website,
        rating: businessData.rating,
        reviews_count: businessData.reviews_count,
        category: businessData.category,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        place_id: businessData.place_id,
        status: "completed",
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    console.log("Google Business analysis complete for:", businessData.name);

    return new Response(
      JSON.stringify({
        success: true,
        business: businessData,
        lead_id: savedLead?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("google-business-scraper error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
