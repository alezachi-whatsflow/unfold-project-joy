import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jtlrglzcsmqmapizqgzu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTQ4ODQsImV4cCI6MjA4NjE3MDg4NH0.sODjBO9xMwr_Fg-JueCcYF0tOGwvtQ0y1L5_BF8_0Jc";

// Using 'any' as Database type since we use an external Supabase instance
// with tables not tracked by Lovable Cloud's auto-generated types
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY);
