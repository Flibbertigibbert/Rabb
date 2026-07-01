import { redirect } from 'next/navigation';
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
  // row. This query doubles as a live confirmation that RLS + the
  // signup trigger both worked end-to-end for a real user.
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('business_name, slug, email, created_at')
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
          <p style={{ color: '#666' }}>{merchant.email}</p>
        </>
      )}
    </main>
  );
}
