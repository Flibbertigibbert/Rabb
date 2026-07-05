import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  console.log('Subdomain detected:', subdomain);

  // Storefront is a fully public, anon-only surface (architecture rule
  // 3) — pass direct /storefront/* requests straight through untouched,
  // on every host. This is what makes /storefront/[slug] reachable as a
  // plain path on the deployed *.vercel.app host (our testing fallback
  // until a real custom domain exists — see PLAN.md's launch-gating
  // section), and it also skips the session-refresh work below
  // entirely, since a storefront request never needs it.
  if (request.nextUrl.pathname.startsWith('/storefront')) {
    return NextResponse.next();
  }

  // Storefront (subdomain) routes are public — only /dashboard/* below
  // requires a session. This response object is what carries refreshed
  // session cookies back to the browser; it must be reused (not replaced)
  // by every cookies.setAll call below.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Also refreshes the session (rewriting cookies via setAll above) if the
  // access token has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Storefront routing: {slug}.localhost dev subdomains rewrite to the
  // public storefront shell. Scoped to *.localhost only so it can't
  // misfire on the *.vercel.app production host, which has no real
  // custom domain yet (see PLAN.md) — there, direct /storefront/[slug]
  // paths are already handled by the early return above instead.
  const hostname = host.split(':')[0];
  const slugMatch = hostname.match(/^([^.]+)\.localhost$/);

  if (slugMatch) {
    const slug = slugMatch[1];
    const suffix = request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname;
    const url = request.nextUrl.clone();
    url.pathname = `/storefront/${slug}${suffix}`;
    const rewritten = NextResponse.rewrite(url);
    response.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));
    return rewritten;
  }

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
