import { createClient } from "@supabase/supabase-js";

// These are public keys (anon key is safe for frontend)
// Loaded from env at build time, with fallbacks for Railway deployment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTQ4ODQsImV4cCI6MjA4NjE3MDg4NH0.sODjBO9xMwr_Fg-JueCcYF0tOGwvtQ0y1L5_BF8_0Jc";

// Using 'any' as Database type since tables are managed via migrations
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY);
