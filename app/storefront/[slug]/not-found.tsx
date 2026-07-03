import styles from '../../public.module.css';

export default function StorefrontNotFound() {
  return (
    <main className={styles.notFoundShell}>
      <div className={styles.notFoundBadge}>404</div>
      <h1 className={styles.notFoundTitle}>Store not found</h1>
      <p className={styles.notFoundBody}>
        We couldn't find a storefront at this address. Double-check the link
        and try again.
      </p>
    </main>
  );
}
