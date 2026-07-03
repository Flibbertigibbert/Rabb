'use client';

import { useMemo, useState } from 'react';
import Script from 'next/script';
import styles from '../../public.module.css';

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number;
  stock_quantity: number;
};

type Stage = 'form' | 'processing' | 'retry' | 'confirming';

// Nigerian mobile formats: 0XXXXXXXXXX (11 digits) or +234XXXXXXXXXX.
const PHONE_REGEX = /^(0\d{10}|\+234\d{10})$/;

export default function StorefrontProducts({
  slug,
  products,
  paymentsActive,
}: {
  slug: string;
  products: Product[];
  paymentsActive: boolean;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [panelOpen, setPanelOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>('form');
  const [accessCode, setAccessCode] = useState<string | null>(null);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({
          product: products.find((p) => p.id === productId)!,
          quantity: qty,
        })),
    [cart, products]
  );

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function updateQuantity(productId: string, delta: number, maxStock: number) {
    setCart((prev) => {
      const next = Math.max(0, Math.min(maxStock, (prev[productId] || 0) + delta));
      return { ...prev, [productId]: next };
    });
  }

  // Opens the Paystack popup for an already-initialized transaction.
  // onSuccess here means "the popup completed" — it does NOT mean the
  // order is paid. The order stays 'pending' until the webhook (3.3)
  // verifies the payment server-side; we only ever show a "confirming"
  // state, never a false success.
  function openPaystackPopup(code: string) {
    const PaystackPop = (window as unknown as { PaystackPop?: new () => any }).PaystackPop;

    if (!PaystackPop) {
      setStage('retry');
      setError('Payment could not load. Check your connection and try again.');
      return;
    }

    const popup = new PaystackPop();
    popup.resumeTransaction(code, {
      onSuccess: () => {
        setStage('confirming');
      },
      onCancel: () => {
        setStage('retry');
      },
    });
  }

  async function initializePayment(orderId: string) {
    const res = await fetch('/api/paystack/initialize-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStage('form');
      setError(data.error || 'Could not start payment. Please try again.');
      return;
    }

    setAccessCode(data.access_code);
    openPaystackPopup(data.access_code);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      setError('Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).');
      return;
    }
    if (!address.trim()) {
      setError('Enter a delivery address.');
      return;
    }

    setStage('processing');

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        customer_address: address,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStage('form');
      setError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    await initializePayment(data.order_id);
  }

  return (
    <>
      <Script src="https://js.paystack.co/v2/inline.js" strategy="lazyOnload" />

      {stage === 'confirming' ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>Payment received, confirming…</p>
          <p className={styles.emptyBody}>
            We're confirming your payment now. Your order stays on hold until
            that's done — this usually only takes a moment.
          </p>
        </div>
      ) : (
        <>
          {!paymentsActive && (
            <div className={styles.checkoutNotice}>
              This store isn't accepting online payments yet — check back soon.
            </div>
          )}

          <div className={styles.productGrid}>
            {products.map((product) => {
              const soldOut = product.stock_quantity <= 0;
              const quantity = cart[product.id] || 0;
              return (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.productImageWrap}>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={styles.productImage}
                        style={{ opacity: soldOut ? 0.45 : 1 }}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>No photo</div>
                    )}
                    {soldOut && <span className={styles.soldOutBadge}>Sold out</span>}
                  </div>
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>{product.name}</p>
                    <p className={styles.productPrice}>
                      ₦{product.selling_price.toLocaleString()}
                    </p>

                    {paymentsActive && !soldOut && (
                      <div className={styles.qtyStepper}>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(product.id, -1, product.stock_quantity)}
                          disabled={quantity === 0}
                          aria-label={`Decrease quantity of ${product.name}`}
                        >
                          −
                        </button>
                        <span className={styles.qtyValue}>{quantity}</span>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(product.id, 1, product.stock_quantity)}
                          disabled={quantity >= product.stock_quantity}
                          aria-label={`Increase quantity of ${product.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {itemCount > 0 && !panelOpen && (
            <div className={styles.cartBar}>
              <span>
                {itemCount} item{itemCount > 1 ? 's' : ''} · ₦{totalAmount.toLocaleString()}
              </span>
              <button className={styles.cartBarButton} onClick={() => setPanelOpen(true)}>
                Checkout
              </button>
            </div>
          )}

          {panelOpen && (
            <div className={styles.checkoutOverlay} onClick={() => setPanelOpen(false)}>
              <div className={styles.checkoutPanel} onClick={(e) => e.stopPropagation()}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Your details</p>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className={styles.checkoutClose}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--pub-ink-muted)', marginBottom: '1rem' }}>
                  {itemCount} item{itemCount > 1 ? 's' : ''} · ₦{totalAmount.toLocaleString()}
                </p>

                {stage === 'retry' && (
                  <div className={styles.checkoutNotice} style={{ marginBottom: '1rem' }}>
                    Payment wasn't completed. Your order is saved — try again
                    when you're ready.
                  </div>
                )}

                {stage === 'retry' ? (
                  <button
                    type="button"
                    className={styles.checkoutSubmit}
                    onClick={() => accessCode && openPaystackPopup(accessCode)}
                  >
                    Complete payment · ₦{totalAmount.toLocaleString()}
                  </button>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <label className={styles.formLabel}>
                      Name
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={styles.formInput}
                        placeholder="Your name"
                      />
                    </label>

                    <label className={styles.formLabel}>
                      Phone
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={styles.formInput}
                        placeholder="08012345678"
                      />
                    </label>

                    <label className={styles.formLabel}>
                      Email (optional)
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.formInput}
                        placeholder="For your receipt"
                      />
                    </label>

                    <label className={styles.formLabel}>
                      Delivery address
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={styles.formTextarea}
                        rows={2}
                        placeholder="Where should we deliver this?"
                      />
                    </label>

                    {error && <p className={styles.formError}>{error}</p>}

                    <button
                      type="submit"
                      disabled={stage === 'processing'}
                      className={styles.checkoutSubmit}
                    >
                      {stage === 'processing'
                        ? 'Placing order…'
                        : `Place order · ₦${totalAmount.toLocaleString()}`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
