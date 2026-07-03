'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton({ className }: { className?: string }) {
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
    <button onClick={handleLogout} disabled={loading} className={className}>
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
