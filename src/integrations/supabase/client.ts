import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jtlrglzcsmqmapizqgzu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTQ4ODQsImV4cCI6MjA4NjE3MDg4NH0.sODjBO9xMwr_Fg-JueCcYF0tOGwvtQ0y1L5_BF8_0Jc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
