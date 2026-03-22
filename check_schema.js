import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtlrglzcsmqmapizqgzu.supabase.co';
const supabaseKey = 'sb_publishable_Uu5shisvJQ9-QOjjvQ3hqw_RHG5EAbR';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const t = await supabase.from('tenants').select('slug').limit(1);
  console.log('tenants:', t);
  const a = await supabase.from('accounts').select('slug').limit(1);
  console.log('accounts:', a);
}
check();
