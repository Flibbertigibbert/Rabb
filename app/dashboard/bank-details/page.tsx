'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../dashboard.module.css';

type Bank = { name: string; code: string };

export default function BankDetailsPage() {
  const router = useRouter();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setError('Could not load bank list. Refresh to try again.'));
  }, []);

  // Reset verification whenever the inputs change — a resolved name
  // should never be trusted once the underlying details have changed.
  function handleBankChange(code: string) {
    setBankCode(code);
    setResolvedName(null);
  }

  function handleAccountNumberChange(value: string) {
    setAccountNumber(value);
    setResolvedName(null);
  }

  async function handleVerify() {
    setError(null);
    setResolving(true);

    const res = await fetch('/api/paystack/resolve-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
    });
    const data = await res.json();

    setResolving(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setResolvedName(data.account_name);
  }

  async function handleActivate() {
    setError(null);
    setSaving(true);

    const bankName = banks.find((b) => b.code === bankCode)?.name || '';

    const res = await fetch('/api/paystack/create-subaccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bankName,
      }),
    });
    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main style={{ padding: '2rem 1.25rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Activate payments
        </h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Add your settlement bank account so you can start receiving payouts
          from sales.
        </p>

        <label className={styles.label}>
          Bank
          <select
            value={bankCode}
            onChange={(e) => handleBankChange(e.target.value)}
            className={styles.select}
          >
            <option value="">Select your bank</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Account number
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            placeholder="0123456789"
            className={styles.input}
          />
        </label>

        {error && <p className={styles.errorText}>{error}</p>}

        {!resolvedName ? (
          <button
            onClick={handleVerify}
            disabled={!bankCode || accountNumber.length < 10 || resolving}
            className={styles.btnPrimary}
            style={{ width: '100%' }}
          >
            {resolving ? 'Verifying…' : 'Verify account'}
          </button>
        ) : (
          <>
            <div className={styles.card} style={{ background: '#f4f4f4', marginBottom: '1rem', textAlign: 'left' }}>
              <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                Account name:
              </p>
              <p style={{ fontWeight: 600 }}>{resolvedName}</p>
            </div>
            <button onClick={handleActivate} disabled={saving} className={styles.btnPrimary} style={{ width: '100%' }}>
              {saving ? 'Activating…' : 'Confirm & activate payments'}
            </button>
          </>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className={styles.btnSecondary}
          style={{ width: '100%', marginTop: '0.75rem', border: 'none' }}
        >
          Do this later
        </button>
      </div>
    </main>
  );
}
