import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://knnwgijcrpbgqhdzmdrp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubndnaWpjcnBiZ3FoZHptZHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODI4OTUsImV4cCI6MjA4ODI1ODg5NX0.IHQgsJvZE6Je-4x7ODxkLghffumZQYrqjBFNXiIA4Sk";

// Using 'any' as Database type since tables are managed via migrations
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY);
