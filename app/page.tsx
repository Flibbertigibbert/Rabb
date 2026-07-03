import Link from 'next/link';
import RotatingWord from './rotating-word';
import Reveal from './reveal';
import styles from './public.module.css';

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          Rabb
        </Link>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.btnGhost}>
            Login
          </Link>
          <Link href="/signup" className={styles.btnSolid}>
            Create your store
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <h1 className={`${styles.heroHeadline} ${styles.heroAnim}`}>
          Sell your <RotatingWord /> business online in minutes
        </h1>
        <p className={`${styles.heroSub} ${styles.heroAnim}`}>
          An instant storefront link, Paystack payments built in, and real
          profit tracking — not just a sales log.
        </p>
        <div className={`${styles.heroCtaRow} ${styles.heroAnim}`}>
          <Link href="/signup" className={styles.btnSolidLg}>
            Create your store
          </Link>
        </div>
      </header>

      <section className={styles.section}>
        <Reveal>
          <div className={styles.featureRow}>
            <div className={styles.featureVisual}>
              <div className={styles.mockCard}>
                <p className={styles.mockProfitLabel}>This week's profit</p>
                <p className={styles.mockProfitAmount}>₦45,230</p>
                <div className={styles.mockBarTrack}>
                  <div className={styles.mockBarFill} style={{ width: '68%' }} />
                </div>
              </div>
            </div>
            <div className={styles.featureCopy}>
              <span className={styles.featureEyebrow}>Know your numbers</span>
              <h2 className={styles.featureTitle}>Know your real profit, not just your sales</h2>
              <p className={styles.featureBody}>
                Add a cost price once and every sale shows what you actually
                made — not just what came in. No more guessing whether a busy
                week was a profitable one.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className={`${styles.featureRow} ${styles.featureRowReverse}`}>
            <div className={styles.featureVisual}>
              <div className={styles.mockCard}>
                <div className={styles.mockBrowserBar}>
                  <span className={styles.mockDot} />
                  <span className={styles.mockDot} />
                  <span className={styles.mockDot} />
                  <span className={styles.mockUrl}>yourshop.rabb.store</span>
                </div>
                <div className={styles.mockStoreMini}>
                  <div className={styles.mockStoreMiniAvatar} />
                  <div className={styles.mockStoreMiniName} />
                </div>
                <div className={styles.mockTileGrid}>
                  <div className={styles.mockTile} />
                  <div className={styles.mockTile} />
                  <div className={styles.mockTile} />
                </div>
              </div>
            </div>
            <div className={styles.featureCopy}>
              <span className={styles.featureEyebrow}>Go live fast</span>
              <h2 className={styles.featureTitle}>An instant storefront link for your bio</h2>
              <p className={styles.featureBody}>
                Get a clean, shareable link the moment you sign up. Drop it in
                your Instagram or WhatsApp bio and start taking orders — no
                website builder, no waiting.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className={styles.featureRow}>
            <div className={styles.featureVisual}>
              <div className={styles.mockCard}>
                <div className={styles.mockSplitRow}>
                  <span>Customer pays</span>
                  <span>₦10,000</span>
                </div>
                <div className={styles.mockSplitRow}>
                  <span>Platform fee (1.5%)</span>
                  <span>−₦150</span>
                </div>
                <div className={styles.mockSplitRowTotal}>
                  <span>You receive</span>
                  <span>₦9,850</span>
                </div>
              </div>
            </div>
            <div className={styles.featureCopy}>
              <span className={styles.featureEyebrow}>Get paid directly</span>
              <h2 className={styles.featureTitle}>Automatic split payments</h2>
              <p className={styles.featureBody}>
                Every payment splits automatically at checkout — your share
                lands in your own bank account. We only take our 1.5% when
                you actually make a sale.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className={`${styles.featureRow} ${styles.featureRowReverse}`}>
            <div className={styles.featureVisual}>
              <div className={styles.mockCard}>
                <div className={styles.mockAlertCard}>
                  <span>Ankara Dress</span>
                  <span>2 left</span>
                </div>
                <div className={styles.mockOrderRow}>
                  <span>Order #1082 · ₦12,000</span>
                  <span className={styles.mockOrderStatus}>Paid</span>
                </div>
              </div>
            </div>
            <div className={styles.featureCopy}>
              <span className={styles.featureEyebrow}>Stay on top of stock</span>
              <h2 className={styles.featureTitle}>Low-stock alerts and order tracking</h2>
              <p className={styles.featureBody}>
                See what's running low before you're caught out, and watch
                orders come in and get paid — all from one dashboard on your
                phone.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <div className={styles.ctaBand}>
        <p className={styles.ctaBandTitle}>Your store, live in 3 minutes</p>
        <Link href="/signup" className={styles.ctaBandButton}>
          Create your store
        </Link>
      </div>

      <p className={styles.pricingStrip}>
        <strong>No subscription.</strong> 1.5% per sale — you only pay when
        you earn.
      </p>

      <section className={`${styles.section} ${styles.sectionTint}`}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.featureTitle}>Questions</h2>
        </div>
        <div className={styles.faqList}>
          <details className={styles.faqItem}>
            <summary>Is it free to start?</summary>
            <p className={styles.faqAnswer}>
              Yes. There's no subscription and no setup fee — you only pay
              1.5% on sales that actually go through.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>How do I get paid?</summary>
            <p className={styles.faqAnswer}>
              Customer payments split automatically at checkout through
              Paystack — your share settles straight to your own bank
              account.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>Do my customers need an account?</summary>
            <p className={styles.faqAnswer}>
              No. Checkout is guest-only — just a name, phone number, and
              delivery address.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>When do I need CAC registration?</summary>
            <p className={styles.faqAnswer}>
              You can build your store and browse in test mode right away.
              CAC registration is needed before Paystack activates live
              payments for your account.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>How is this different from just posting on Instagram?</summary>
            <p className={styles.faqAnswer}>
              Instagram gets you likes; it doesn't tell you if you made
              money. We track your real cost vs. selling price, so every sale
              shows actual profit — not just revenue.
            </p>
          </details>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.wordmark}>Rabb</span>
        <div className={styles.footerLinks}>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
        </div>
        <span>© {year}</span>
      </footer>
    </div>
  );
}
