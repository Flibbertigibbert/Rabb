'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored in auth.users.raw_user_meta_data — the 0004 trigger
        // reads this to create the merchants row automatically.
        data: { business_name: businessName },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is ON in Supabase Auth settings, there's
    // no session yet — data.session will be null.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.push('/dashboard');
  }

  if (checkEmail) {
    return (
      <main style={containerStyle}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Check your email
        </h1>
        <p style={{ color: '#666', maxWidth: 380 }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account, then come back and log in.
        </p>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Create your storefront
        </h1>

        <label style={labelStyle}>
          Business name
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Buy My Wear"
            style={inputStyle}
          />
        </label>

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={inputStyle}
          />
        </label>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
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
