export default function StorefrontNotFound() {
  return (
    <main style={containerStyle}>
      <div style={badgeStyle}>404</div>
      <h1 style={titleStyle}>Store not found</h1>
      <p style={bodyStyle}>
        We couldn't find a storefront at this address. Double-check the link
        and try again.
      </p>
    </main>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: 'center',
  background: '#fafafa',
};

const badgeStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#888',
  marginBottom: '0.75rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.375rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: '#666',
  maxWidth: '20rem',
  lineHeight: 1.5,
};
