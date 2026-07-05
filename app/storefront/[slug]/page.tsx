import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/anon';
import StorefrontProducts from './storefront-products';
import styles from '../../public.module.css';

// The anon Supabase client (lib/supabase/anon.ts) deliberately never
// touches cookies(), which means this page has no "Dynamic API" usage
// to automatically opt it out of Next's static/Full Route Cache. Without
// this, Next treats /storefront/[slug] as static-after-first-render —
// the first request for a given slug gets cached indefinitely, so
// merchant changes (payments activation, new products, stock, price
// edits) would never show up without a redeploy. This page must always
// reflect current DB state, so force dynamic rendering explicitly.
export const dynamic = 'force-dynamic';

export default async function StorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // payments_active: a generated boolean (paystack_subaccount_code is not
  // null), anon-readable per supabase/0010_merchants_anon_subaccount_flag.sql
  // — this exposes only the flag needed to decide whether to show checkout
  // controls, never the underlying Paystack subaccount code itself.
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, payments_active')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!merchant) {
    notFound();
  }

  // anon SELECT on merchants.id is required for this filter — see
  // supabase/0008_merchants_anon_id.sql.
  const { data: products } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, stock_quantity')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const initial = merchant.business_name.trim().charAt(0).toUpperCase();

  return (
    <div className={styles.storeShell}>
      <div className={styles.storeHeader}>
        <div className={styles.storeAvatar}>{initial}</div>
        <h1 className={styles.storeName}>{merchant.business_name}</h1>
        <p className={styles.storeSubtitle}>Online store</p>
      </div>

      <div className={styles.storeBody}>
        {!products || products.length === 0 ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyTitle}>No products yet</p>
            <p className={styles.emptyBody}>
              {merchant.business_name} is setting up shop. Check back soon.
            </p>
          </div>
        ) : (
          <StorefrontProducts
            slug={merchant.slug}
            products={products}
            paymentsActive={!!merchant.payments_active}
          />
        )}
      </div>
    </div>
  );
}
