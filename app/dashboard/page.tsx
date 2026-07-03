import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './logout-button';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LogoutButton />
      </div>

      {error || !merchant ? (
        <>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            No merchant row found
          </h1>
          <p style={{ color: '#666', maxWidth: 420 }}>
            You're logged in, but no matching row exists in{' '}
            <code>merchants</code>. Check that the 0004 trigger ran and that
            RLS policies from 0.2 are applied.
          </p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Welcome, {merchant.business_name} 🎉
          </h1>
          <p style={{ color: '#666' }}>
            Slug: <code>{merchant.slug}</code>
          </p>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{merchant.email}</p>

          <Link
            href="/dashboard/products"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: '#fff',
              color: '#111',
              border: '1px solid #ddd',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Manage products
          </Link>

          {lowStockProducts.length > 0 && (
            <div
              style={{
                padding: '1rem',
                background: '#fdeeee',
                border: '1px solid #f3c6c2',
                borderRadius: '8px',
                maxWidth: 380,
                width: '100%',
                textAlign: 'left',
                marginBottom: '1rem',
              }}
            >
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
                    borderTop: '1px solid #f3c6c2',
                  }}
                >
                  <span>{product.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#a13a33' }}>
                      {product.stock_quantity} left (threshold {product.low_stock_threshold})
                    </span>
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      style={{ color: '#111', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Edit
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          )}

          {merchant.kyc_status !== 'verified' && (
            <div
              style={{
                padding: '1rem',
                background: '#fff8e6',
                border: '1px solid #f0d68a',
                borderRadius: '8px',
                maxWidth: 380,
              }}
            >
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Add your bank details to start accepting payments from
                customers.
              </p>
              <Link
                href="/dashboard/bank-details"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#111',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Activate payments
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}