export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
        Platform skeleton is live 🎉
      </h1>
      <p style={{ color: '#666', maxWidth: 420 }}>
        Phase 0.3 — Next.js app deployed on Vercel. Tenant storefronts and
        onboarding land here in Phase 1.
      </p>
    </main>
  );
}
