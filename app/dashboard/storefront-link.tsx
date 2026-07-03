'use client';

import { useState } from 'react';
import styles from './dashboard.module.css';

export default function StorefrontLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.card} style={{ width: '100%', textAlign: 'left', marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Your storefront
      </p>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#333',
          wordBreak: 'break-all',
          marginBottom: '0.75rem',
        }}
      >
        {url}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleCopy} className={styles.btnSecondary}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>
          View my store
        </a>
      </div>
    </div>
  );
}
