'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number;
  cost_price: number | null;
  stock_quantity: number;
  is_active: boolean;
};

export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data, error: loadError } = await supabase
      .from('products')
      .select('id, name, image_url, selling_price, cost_price, stock_quantity, is_active')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError('Could not load products. Refresh to try again.');
      return;
    }

    setProducts(data);
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
  }

  return (
    <main style={containerStyle}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={headerRowStyle}>
          <h1 style={{ fontSize: '1.375rem' }}>Products</h1>
          <Link href="/dashboard/products/new" style={addButtonStyle}>
            + Add product
          </Link>
        </div>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        {products === null && <p style={{ color: '#666' }}>Loading…</p>}

        {products?.length === 0 && (
          <p style={{ color: '#666' }}>
            No products yet.{' '}
            <Link href="/dashboard/products/new" style={{ color: '#111', fontWeight: 600 }}>
              Add your first one.
            </Link>
          </p>
        )}

        {products?.map((product) => (
          <div key={product.id} style={rowStyle}>
            <div style={thumbStyle}>
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                />
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>No photo</span>
              )}
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 600 }}>
                {product.name}
                {!product.is_active && (
                  <span style={inactiveBadgeStyle}>inactive</span>
                )}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                ₦{product.selling_price.toLocaleString()} · Stock: {product.stock_quantity}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <Link href={`/dashboard/products/${product.id}/edit`} style={linkButtonStyle}>
                Edit
              </Link>
              <button
                onClick={() => handleDelete(product)}
                disabled={busyId === product.id}
                style={deleteButtonStyle}
              >
                {busyId === product.id ? '…' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '2rem 1.25rem',
  fontFamily: 'system-ui, sans-serif',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
};

const addButtonStyle: React.CSSProperties = {
  padding: '0.5rem 0.875rem',
  background: '#111',
  color: '#fff',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 600,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem',
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '8px',
  marginBottom: '0.75rem',
};

const thumbStyle: React.CSSProperties = {
  width: '3rem',
  height: '3rem',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f4f4',
  borderRadius: '6px',
  textAlign: 'center',
};

const inactiveBadgeStyle: React.CSSProperties = {
  marginLeft: '0.5rem',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: '#888',
  background: '#f0f0f0',
  padding: '0.125rem 0.375rem',
  borderRadius: '4px',
};

const linkButtonStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#111',
  textDecoration: 'none',
  padding: '0.25rem 0.5rem',
  border: '1px solid #ddd',
  borderRadius: '6px',
  textAlign: 'center',
};

const deleteButtonStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#c0392b',
  background: 'transparent',
  border: '1px solid #f0c4bd',
  borderRadius: '6px',
  padding: '0.25rem 0.5rem',
  cursor: 'pointer',
};
