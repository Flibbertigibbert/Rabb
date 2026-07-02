import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signup');
  }

  // No .eq('id', user.id) needed here — RLS (merchants_select_own from
  // Phase 0.2) already restricts this to the logged-in merchant's own
  // row.
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('business_name, slug, email, created_at, kyc_status')
    .single();

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
      }}
    >
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