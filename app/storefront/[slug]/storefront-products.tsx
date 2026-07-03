'use client';

import { useMemo, useState } from 'react';
import styles from '../../public.module.css';

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number;
  stock_quantity: number;
};

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

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

    setSubmitting(true);

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
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    setOrderPlaced(true);
  }

  if (orderPlaced) {
    return (
      <div className={styles.emptyCard}>
        <p className={styles.emptyTitle}>Order received</p>
        <p className={styles.emptyBody}>
          We've got your order. Payment setup is coming very soon — the
          seller will reach out to confirm.
        </p>
      </div>
    );
  }

  return (
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

              <button type="submit" disabled={submitting} className={styles.checkoutSubmit}>
                {submitting ? 'Placing order…' : `Place order · ₦${totalAmount.toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
