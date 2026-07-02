'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    // Hard redirect (not router.push) so no cached/stale server
    // component tree can flash authenticated content post-logout.
    window.location.href = '/login';
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#111',
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
