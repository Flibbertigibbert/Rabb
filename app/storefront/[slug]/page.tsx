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
    .select('id, business_name, slug')
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
    <main style={containerStyle}>
      <div style={avatarStyle}>{initial}</div>
      <h1 style={nameStyle}>{merchant.business_name}</h1>
      <p style={subtitleStyle}>Online store</p>

      {!products || products.length === 0 ? (
        <div style={emptyCardStyle}>
          <p style={emptyTitleStyle}>No products yet</p>
          <p style={emptyBodyStyle}>
            {merchant.business_name} is setting up shop. Check back soon.
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {products.map((product) => {
            const soldOut = product.stock_quantity <= 0;
            return (
              <div key={product.id} style={cardStyle}>
                <div style={imageWrapStyle}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        ...imageStyle,
                        opacity: soldOut ? 0.45 : 1,
                      }}
                    />
                  ) : (
                    <div style={imagePlaceholderStyle}>No photo</div>
                  )}
                  {soldOut && <span style={soldOutBadgeStyle}>Sold out</span>}
                </div>
                <p style={productNameStyle}>{product.name}</p>
                <p style={productPriceStyle}>₦{product.selling_price.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
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

const gridStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '34rem',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '1rem',
  textAlign: 'left',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '10px',
  overflow: 'hidden',
};

const imageWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  background: '#f4f4f4',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const imagePlaceholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  color: '#aaa',
};

const soldOutBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  left: '0.5rem',
  background: 'rgba(17,17,17,0.85)',
  color: '#fff',
  fontSize: '0.6875rem',
  fontWeight: 600,
  padding: '0.1875rem 0.5rem',
  borderRadius: '4px',
};

const productNameStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  padding: '0.625rem 0.625rem 0',
  lineHeight: 1.3,
};

const productPriceStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: '#666',
  padding: '0.25rem 0.625rem 0.75rem',
};
