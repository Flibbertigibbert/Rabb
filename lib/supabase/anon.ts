import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Public, unauthenticated reads only (storefront, product listings).
// Deliberately stateless — no cookie/session plumbing — so RLS always
// evaluates as anon here, even if the visiting browser also holds a
// merchant session cookie (e.g. a merchant previewing their own store).
// Customers never log in (see PLAN.md architecture rule 5).
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
