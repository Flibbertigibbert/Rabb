import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/anon';

export default async function StorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('business_name, slug')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!merchant) {
    notFound();
  }

  const initial = merchant.business_name.trim().charAt(0).toUpperCase();

  return (
    <main style={containerStyle}>
      <div style={avatarStyle}>{initial}</div>
      <h1 style={nameStyle}>{merchant.business_name}</h1>
      <p style={subtitleStyle}>Online store</p>

      <div style={emptyCardStyle}>
        <p style={emptyTitleStyle}>No products yet</p>
        <p style={emptyBodyStyle}>
          {merchant.business_name} is setting up shop. Check back soon.
        </p>
      </div>
    </main>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '3.5rem 1.5rem 3rem',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: 'center',
  background: '#fafafa',
};

const avatarStyle: React.CSSProperties = {
  width: '3.5rem',
  height: '3.5rem',
  borderRadius: '50%',
  background: '#111',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.375rem',
  fontWeight: 600,
  marginBottom: '1.25rem',
};

const nameStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  lineHeight: 1.3,
  maxWidth: '20rem',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: '#888',
  marginTop: '0.375rem',
  marginBottom: '2.5rem',
};

const emptyCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '22rem',
  padding: '2rem 1.5rem',
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '12px',
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: '0.5rem',
};

const emptyBodyStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: '#666',
  lineHeight: 1.5,
};
