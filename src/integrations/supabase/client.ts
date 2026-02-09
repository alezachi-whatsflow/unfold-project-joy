import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jtlrglzcsmqmapizqgzu.supabase.co";
const SUPABASE_ANON_KEY = "sb_secret_Zzq-O5AMLMW9ucd4L98Zmg_sg9bAGOA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
