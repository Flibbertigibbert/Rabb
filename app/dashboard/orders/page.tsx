import styles from '../dashboard.module.css';

export default function OrdersPage() {
  return (
    <main style={{ padding: '2rem 1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '1rem' }}>Orders</h1>
        <div className={styles.card}>
          <p style={{ color: '#666', fontSize: '0.9375rem' }}>
            Coming soon. Customer orders will show up here once checkout goes
            live.
          </p>
        </div>
      </div>
    </main>
  );
}
