'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Toast from '../toast';
import styles from '../dashboard.module.css';

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number;
  cost_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  margin_unknown: boolean;
};

export default function ProductsPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Optional default margin %, used only to *estimate and display* a
  // margin for margin_unknown products — never written to
  // products.cost_price, so margin_unknown stays trigger-owned.
  const [defaultMarginPercent, setDefaultMarginPercent] = useState<number | null>(null);
  const [marginInput, setMarginInput] = useState('');
  const [savingMargin, setSavingMargin] = useState(false);
  const [marginSaved, setMarginSaved] = useState(false);

  useEffect(() => {
    loadProducts();
    loadMarginSetting();
  }, []);

  // The create/edit forms redirect here with a query flag so a save
  // always confirms visibly, even across a page navigation.
  useEffect(() => {
    if (searchParams.get('created')) {
      setToast('Product added');
      router.replace('/dashboard/products');
    } else if (searchParams.get('updated')) {
      setToast('Changes saved');
      router.replace('/dashboard/products');
    }
  }, [searchParams, router]);

  async function loadProducts() {
    const { data, error: loadError } = await supabase
      .from('products')
      .select(
        'id, name, image_url, selling_price, cost_price, stock_quantity, is_active, margin_unknown'
      )
      .order('created_at', { ascending: false });

    if (loadError) {
      setError('Could not load products. Refresh to try again.');
      return;
    }

    setProducts(data);
  }

  async function loadMarginSetting() {
    const { data } = await supabase.from('merchants').select('default_margin_percent').single();

    if (data?.default_margin_percent != null) {
      setDefaultMarginPercent(data.default_margin_percent);
      setMarginInput(String(data.default_margin_percent));
    }
  }

  async function handleSaveMargin(e: React.FormEvent) {
    e.preventDefault();
    setSavingMargin(true);
    setMarginSaved(false);

    const value = marginInput === '' ? null : parseFloat(marginInput);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from('merchants')
      .update({ default_margin_percent: value })
      .eq('id', user?.id);

    setSavingMargin(false);

    if (updateError) {
      setError('Could not save your default margin. Try again.');
      return;
    }

    setDefaultMarginPercent(value);
    setMarginSaved(true);
    setTimeout(() => setMarginSaved(false), 3000);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Remove "${product.name}"?`)) return;

    setBusyId(product.id);
    setError(null);

    // Prefer hard delete, but fall back to soft-delete (is_active = false)
    // when order history references this product — orders/order_items
    // must never lose their product link.
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product.id);

    if (count && count > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id);

      setBusyId(null);

      if (updateError) {
        setError('Could not deactivate this product. Try again.');
        return;
      }

      setProducts((prev) =>
        prev
          ? prev.map((p) => (p.id === product.id ? { ...p, is_active: false } : p))
          : prev
      );
      setToast('Product deactivated (it has order history)');
      return;
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (product.image_url) {
      const path = product.image_url.split('/product-images/')[1];
      if (path) {
        await supabase.storage.from('product-images').remove([path]);
      }
    }

    setBusyId(null);

    if (deleteError) {
      setError('Could not delete this product. Try again.');
      return;
    }

    setProducts((prev) => (prev ? prev.filter((p) => p.id !== product.id) : prev));
    setToast('Product removed');
  }

  return (
    <main style={{ padding: '2rem 1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Products</h1>
          <Link href="/dashboard/products/new" className={styles.btnPrimary}>
            + Add product
          </Link>
        </div>

        <form onSubmit={handleSaveMargin} className={styles.card} style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
            Default margin %
          </label>
          <p className={styles.textMuted} style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            Used only to estimate a margin on products without a real cost price —
            never changes the actual cost price.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              placeholder="e.g. 30"
              className={styles.input}
              style={{ width: '5rem', marginTop: 0 }}
            />
            <button type="submit" disabled={savingMargin} className={styles.btnPrimary}>
              {savingMargin ? 'Saving…' : 'Save'}
            </button>
          </div>
          {marginSaved && <p className={styles.successText}>Default margin saved.</p>}
        </form>

        {error && <p className={styles.errorText}>{error}</p>}

        {products === null && <p className={styles.textMuted}>Loading…</p>}

        {products?.length === 0 && (
          <div className={styles.card} style={{ textAlign: 'center' }}>
            <p className={styles.textMuted} style={{ marginBottom: '0.75rem' }}>No products yet.</p>
            <Link href="/dashboard/products/new" className={styles.btnPrimary}>
              Add your first product
            </Link>
          </div>
        )}

        {products?.map((product) => (
          <div key={product.id} className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className={styles.thumb}>
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className={styles.textFaint} style={{ fontSize: '0.75rem' }}>No photo</span>
              )}
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 600 }}>
                {product.name}
                {!product.is_active && <span className={styles.badgeNeutral}>inactive</span>}
                {product.margin_unknown && (
                  <span className={styles.badgeWarning}>margin unknown</span>
                )}
              </p>
              <p className={styles.textMuted} style={{ fontSize: '0.875rem' }}>
                ₦{product.selling_price.toLocaleString()} · Stock: {product.stock_quantity}
              </p>
              {renderMargin(product, defaultMarginPercent)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <Link href={`/dashboard/products/${product.id}/edit`} className={styles.btnSecondary}>
                Edit
              </Link>
              <button
                onClick={() => handleDelete(product)}
                disabled={busyId === product.id}
                className={styles.btnDanger}
              >
                {busyId === product.id ? '…' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </main>
  );
}

// Real margins (from a known cost_price) render as plain text. Estimated
// margins (derived from the merchant's default margin %) always carry a
// "~" prefix, an "(estimated)" label, and distinct amber/italic styling —
// per PLAN.md 2.3, these must never be visually confusable with a real
// margin, and margin_unknown products with no default set show neither.
function renderMargin(product: Product, defaultMarginPercent: number | null) {
  if (!product.margin_unknown && product.cost_price != null) {
    const marginAmount = product.selling_price - product.cost_price;
    const marginPercent =
      product.selling_price > 0 ? (marginAmount / product.selling_price) * 100 : 0;
    return (
      <p style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
        Margin: ₦{marginAmount.toLocaleString()} ({marginPercent.toFixed(0)}%)
      </p>
    );
  }

  if (product.margin_unknown && defaultMarginPercent != null) {
    const estimatedAmount = product.selling_price * (defaultMarginPercent / 100);
    return (
      <p style={{ fontSize: '0.8125rem', color: 'var(--db-warning)', fontStyle: 'italic', marginTop: '0.125rem' }}>
        ~₦{estimatedAmount.toLocaleString()} (~{defaultMarginPercent}%) estimated
      </p>
    );
  }

  return null;
}
