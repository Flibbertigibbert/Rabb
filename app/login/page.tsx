'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError('Incorrect email or password. Please try again.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main style={containerStyle}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Log in to your storefront
        </h1>

        <label style={labelStyle}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            style={inputStyle}
          />
        </label>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#111', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </form>
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
  fontFamily: 'system-ui, sans-serif',
  textAlign: 'center',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.375rem',
  padding: '0.625rem 0.75rem',
  fontSize: '1rem',
  border: '1px solid #ddd',
  borderRadius: '6px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#fff',
  background: '#111',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
