import { createClient } from "@supabase/supabase-js";

// These are public keys (anon key is safe for frontend)
// Loaded from env at build time, with fallbacks for Railway deployment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MDI5ODAwLCJleHAiOjE5MzE3MDk4MDB9.nGuFy4XjBPEkzvfxaM9P_NH5zj9Fq2VSMQMIaDOGhoc";

// Using 'any' as Database type since tables are managed via migrations
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY);
