import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS entirely. Sanctioned uses only
// (architecture rule 2): the anonymous checkout write path
// (app/api/checkout/route.ts) and the Paystack webhook handler (3.3).
// Never import this from a client component or any file reachable by
// the browser — the service role key must stay server-side only.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
