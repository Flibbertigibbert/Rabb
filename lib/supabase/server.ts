import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used in Server Components / Route Handlers where the merchant is
// authenticated — this respects RLS (merchant_id = auth.uid()).
// For service-role writes (checkout, webhook handler in Phase 3),
// use a separate client built with SUPABASE_SERVICE_ROLE_KEY instead —
// never expose that key to the browser.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a writable
            // cookie store — safe to ignore if middleware handles
            // session refresh.
          }
        },
      },
    }
  );
}
