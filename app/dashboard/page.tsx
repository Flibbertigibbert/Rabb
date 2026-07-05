import { headers } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontUrl } from '@/lib/storefront-url';
import StorefrontLink from './storefront-link';
import styles from './dashboard.module.css';

export default async function DashboardPage() {
  const supabase = createClient();

  // Auth is already gated by app/dashboard/layout.tsx — every /dashboard/*
  // page is guaranteed a session by the time it renders.

  // No .eq('id', user.id) needed here — RLS (merchants_select_own from
  // Phase 0.2) already restricts this to the logged-in merchant's own
  // row.
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('business_name, slug, email, created_at, kyc_status')
    .single();

  // stock_quantity <= low_stock_threshold compares two columns on the
  // same row, which PostgREST's query builder can't express as a filter
  // (its operators only compare a column to a literal) — so fetch the
  // merchant's own products (RLS-scoped) and filter in JS instead.
  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock_quantity, low_stock_threshold')
    .order('stock_quantity', { ascending: true });

  const lowStockProducts = (products ?? []).filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  );

  // getStorefrontUrl is host-aware: subdomain form on *.localhost, path
  // form (/storefront/{slug}) everywhere else until the real custom
  // domain exists — see lib/storefront-url.ts.
  const host = headers().get('host') || '';
  const storefrontUrl = merchant ? getStorefrontUrl(host, merchant.slug) : null;

  return (
    <main style={{ padding: '2rem 1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        {error || !merchant ? (
          <>
            <h1 className={styles.pageTitle}>No merchant row found</h1>
            <p className={styles.textMuted} style={{ maxWidth: 420, margin: '0 auto' }}>
              You're logged in, but no matching row exists in{' '}
              <code>merchants</code>. Check that the 0004 trigger ran and that
              RLS policies from 0.2 are applied.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.pageTitle}>Welcome, {merchant.business_name} 🎉</h1>
            <p className={styles.textMuted} style={{ marginBottom: '1.5rem' }}>
              {merchant.email}
            </p>

            {storefrontUrl && <StorefrontLink url={storefrontUrl} />}

            {lowStockProducts.length > 0 && (
              <div className={styles.warningCard} style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Low stock
                </p>
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem',
                      padding: '0.375rem 0',
                      borderTop: '1px solid var(--db-warning-border)',
                    }}
                  >
                    <span>{product.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--db-warning)' }}>
                        {product.stock_quantity} left (threshold {product.low_stock_threshold})
                      </span>
                      <Link href={`/dashboard/products/${product.id}/edit`} className={styles.linkAccent}>
                        Edit
                      </Link>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {merchant.kyc_status !== 'verified' && (
              <div className={styles.warningCard}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  Add your bank details to start accepting payments from
                  customers.
                </p>
                <Link href="/dashboard/bank-details" className={styles.btnPrimary}>
                  Activate payments
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
