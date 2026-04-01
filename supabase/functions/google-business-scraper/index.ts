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

    let APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
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
        maxReviews: 10,
        maxImages: 10,
        includeWebResults: false,
        onlyDataFromSearchPage: false,
        scrapeDirectories: false,
        deeperCityScrape: false,
        additionalInfo: true,
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

    // Log all top-level keys for debugging field mapping
    console.log("Apify place keys:", Object.keys(place).join(", "));
    console.log("Has imageUrls:", Array.isArray(place.imageUrls), "count:", place.imageUrls?.length);
    console.log("orderBy type:", typeof place.orderBy, "isArray:", Array.isArray(place.orderBy), "length:", place.orderBy?.length, "sample:", JSON.stringify(place.orderBy?.[0])?.substring(0, 300));
    console.log("updatesFromCustomers:", Array.isArray(place.updatesFromCustomers), "count:", place.updatesFromCustomers?.length);
    console.log("ownerUpdates:", Array.isArray(place.ownerUpdates), "count:", place.ownerUpdates?.length, "sample:", JSON.stringify(place.ownerUpdates?.[0])?.substring(0, 300));
    console.log("Has reviews:", Array.isArray(place.reviews), "count:", place.reviews?.length);
    console.log("Description:", place.description);
    console.log("AdditionalInfo:", JSON.stringify(place.additionalInfo)?.substring(0, 500));
    console.log("orderOnline:", JSON.stringify(place.orderOnline)?.substring(0, 300));
    console.log("subTitle:", place.subTitle);
    console.log("imagesCount:", place.imagesCount);
    console.log("imageCategories:", JSON.stringify(place.imageCategories)?.substring(0, 300));

    // Extract photos count from multiple possible sources
    const imageUrls: string[] = place.imageUrls || place.images || [];
    const photosCount = imageUrls.length || place.imagesCount || place.photosCount || place.imageCount || 0;

    // Extract description from multiple possible sources, fallback to first ownerUpdate
    const description = place.description
      || place.additionalInfo?.["Sobre"]
      || place.additionalInfo?.["About"]
      || place.additionalInfo?.["Descrição"]
      || place.subTitle
      || (place.additionalInfo ? Object.values(place.additionalInfo).find((v: any) => typeof v === "string" && v.length > 30) : null)
      || (Array.isArray(place.ownerUpdates) && place.ownerUpdates[0]?.text ? place.ownerUpdates[0].text.substring(0, 300) : null)
      || null;

    // Extract products from multiple possible sources
    // orderBy can be an array of objects OR an array of categories with items
    let rawProducts: any[] = [];
    for (const src of [place.orderBy, place.products, place.menu]) {
      if (Array.isArray(src) && src.length > 0) {
        // Check if items are categories containing sub-items
        if (src[0]?.items && Array.isArray(src[0].items)) {
          for (const cat of src) {
            for (const item of (cat.items || [])) {
              rawProducts.push({ ...item, category: cat.title || cat.name || "" });
            }
          }
        } else {
          rawProducts = src;
        }
        break;
      }
    }
    const products = rawProducts.map((p: any) => ({
      name: p.title || p.name || "",
      category: p.category || p.subtitle || "",
      price: p.price || null,
      image_url: p.imageUrl || p.thumbnailUrl || null,
    }));

    // Extract posts/feed from multiple possible sources (owner + customer updates)
    let rawPosts: any[] = [];
    for (const src of [place.ownerUpdates, place.updatesFromCustomers, place.updatesFromGoogle, place.posts, place.updates]) {
      if (Array.isArray(src) && src.length > 0) {
        rawPosts = [...rawPosts, ...src];
      }
    }
    const posts = rawPosts.slice(0, 5).map((u: any) => ({
      text: u.text || u.body || u.title || "",
      date: u.publishedAt || u.publishedAtDate || u.date || null,
      image_url: u.imageUrl || u.thumbnailUrl || null,
    }));

    // Extract reviews
    const rawReviews = place.reviews || [];
    const topReviews = rawReviews.slice(0, 5).map((r: any) => ({
      text: r.text || r.textTranslated || "",
      stars: r.stars,
      publishedAtDate: r.publishedAtDate,
    }));

    // Map to our BusinessLead structure
    const businessData = {
      name: place.title || place.searchString || query,
      address: place.address || place.street || null,
      phone: place.phone || null,
      website: place.website || place.url || null,
      rating: place.totalScore ?? place.rating ?? null,
      reviews_count: place.reviewsCount ?? place.reviews?.length ?? null,
      category: place.categoryName || place.category || null,
      latitude: place.location?.lat ?? null,
      longitude: place.location?.lng ?? null,
      place_id: place.placeId || null,
      opening_hours: place.openingHours || null,
      photos_count: place.imagesCount || photosCount,
      description: description,
      claimed: place.isAdvertising ?? null,
      reviews_distribution: place.reviewsDistribution || null,
      top_reviews: topReviews,
      image_url: imageUrls[0] || place.imageUrl || null,
      maps_url: place.url || `https://www.google.com/maps/place/?q=${encodeURIComponent(query)}`,
      products: products,
      posts: posts,
      has_products: products.length > 0,
      has_recent_posts: posts.length > 0,
      social_profiles: place.socialProfiles || place.additionalInfo?.["Perfis"] || null,
      // Additional business attributes from Google
      additional_info: place.additionalInfo || null,
      image_categories: place.imageCategories || null,
      people_also_search: (place.peopleAlsoSearch || []).slice(0, 5).map((p: any) => ({
        title: p.title || p.name || "",
        category: p.category || "",
      })),
    };

    console.log("Mapped data — products:", products.length, "posts:", posts.length, "photos:", photosCount, "description:", !!description);

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
