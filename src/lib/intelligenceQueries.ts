import { supabase } from "@/integrations/supabase/client";
import { WebScrap, ProfileAnalysis, BusinessLead } from "@/types/intelligence";
import { getTenantId } from "@/lib/tenantResolver";

const resolveTenantId = getTenantId;

// ─── Web Scraps ───

export async function fetchWebScraps(): Promise<WebScrap[]> {
  const { data, error } = await (supabase as any)
    .from("web_scraps")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    keywords: row.keywords,
    technologies: row.technologies,
    value_proposition: row.value_proposition,
    niche: row.niche,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    raw_markdown: row.raw_markdown,
    scraped_at: row.scraped_at,
    status: row.status,
  }));
}

export async function insertWebScrap(scrap: Omit<WebScrap, "id">): Promise<WebScrap> {
  const tenantId = await resolveTenantId();

  const { data, error } = await supabase
    .from("web_scraps")
    .insert({
      url: scrap.url,
      title: scrap.title,
      description: scrap.description,
      keywords: scrap.keywords,
      technologies: scrap.technologies,
      value_proposition: scrap.value_proposition,
      niche: scrap.niche,
      contact_email: scrap.contact_email,
      contact_phone: scrap.contact_phone,
      raw_markdown: scrap.raw_markdown,
      status: scrap.status,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    url: data.url,
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    technologies: data.technologies,
    value_proposition: data.value_proposition,
    niche: data.niche,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    raw_markdown: data.raw_markdown,
    scraped_at: data.scraped_at,
    status: data.status,
  };
}

// ─── Profiles Analysis ───

export async function fetchProfiles(): Promise<ProfileAnalysis[]> {
  const { data, error } = await supabase
    .from("profiles_analysis")
    .select("*")
    .order("analyzed_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    source: row.source,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    followers: row.followers,
    following: row.following,
    posts_count: row.posts_count,
    avg_engagement_rate: row.avg_engagement_rate ? Number(row.avg_engagement_rate) : null,
    profile_url: row.profile_url,
    profile_image_url: row.profile_image_url,
    content_strategy_notes: row.content_strategy_notes,
    authority_score: row.authority_score ? Number(row.authority_score) : null,
    analyzed_at: row.analyzed_at,
    status: row.status,
  }));
}

export async function insertProfile(profile: Omit<ProfileAnalysis, "id">): Promise<ProfileAnalysis> {
  const tenantId = await resolveTenantId();
  const { data, error } = await supabase
    .from("profiles_analysis")
    .insert({
      tenant_id: tenantId,
      source: profile.source,
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      followers: profile.followers,
      following: profile.following,
      posts_count: profile.posts_count,
      avg_engagement_rate: profile.avg_engagement_rate,
      profile_url: profile.profile_url,
      profile_image_url: profile.profile_image_url,
      content_strategy_notes: profile.content_strategy_notes,
      authority_score: profile.authority_score,
      status: profile.status,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    source: data.source,
    username: data.username,
    display_name: data.display_name,
    bio: data.bio,
    followers: data.followers,
    following: data.following,
    posts_count: data.posts_count,
    avg_engagement_rate: data.avg_engagement_rate ? Number(data.avg_engagement_rate) : null,
    profile_url: data.profile_url,
    profile_image_url: data.profile_image_url,
    content_strategy_notes: data.content_strategy_notes,
    authority_score: data.authority_score ? Number(data.authority_score) : null,
    analyzed_at: data.analyzed_at,
    status: data.status,
  };
}

// ─── Business Leads ───

export async function fetchBusinessLeads(): Promise<BusinessLead[]> {
  const { data, error } = await supabase
    .from("business_leads")
    .select("*")
    .order("scraped_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    website: row.website,
    rating: row.rating ? Number(row.rating) : null,
    reviews_count: row.reviews_count,
    category: row.category,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    place_id: row.place_id,
    scraped_at: row.scraped_at,
    status: row.status,
  }));
}

export async function insertBusinessLead(lead: Omit<BusinessLead, "id">): Promise<BusinessLead> {
  const tenantId = await resolveTenantId();
  const { data, error } = await supabase
    .from("business_leads")
    .insert({
      tenant_id: tenantId,
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      website: lead.website,
      rating: lead.rating,
      reviews_count: lead.reviews_count,
      category: lead.category,
      latitude: lead.latitude,
      longitude: lead.longitude,
      place_id: lead.place_id,
      status: lead.status,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    phone: data.phone,
    website: data.website,
    rating: data.rating ? Number(data.rating) : null,
    reviews_count: data.reviews_count,
    category: data.category,
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    place_id: data.place_id,
    scraped_at: data.scraped_at,
    status: data.status,
  };
}
