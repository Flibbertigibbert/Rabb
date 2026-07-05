// Single source of truth for building a merchant's public storefront URL.
// Used by the dashboard's storefront-link module (copy button + view
// link) — any other place that needs to show/link to a merchant's store
// should go through this too, rather than reconstructing the URL locally.
export function getStorefrontUrl(host: string, slug: string): string {
  const [hostname, port] = host.split(':');

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `http://${slug}.localhost${port ? `:${port}` : ':3000'}`;
  }

  // Until the real custom domain exists (see PLAN.md's launch-gating
  // section), storefronts are reachable as a path on whatever host is
  // currently deployed (e.g. *.vercel.app) — the middleware passes
  // /storefront/* paths straight through on every non-localhost host.
  // At launch, once the production domain is live, switch this branch
  // to the subdomain form (`https://${slug}.${hostname}`) — this is the
  // single place to make that change.
  return `https://${host}/storefront/${slug}`;
}
