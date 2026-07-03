'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image-compress';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, []);

  async function loadProduct() {
    const { data, error: loadError } = await supabase
      .from('products')
      .select(
        'name, description, image_url, selling_price, cost_price, stock_quantity, low_stock_threshold, is_active'
      )
      .eq('id', params.id)
      .maybeSingle();

    setLoading(false);

    if (loadError || !data) {
      setNotFound(true);
      return;
    }

    setName(data.name);
    setDescription(data.description || '');
    setExistingImageUrl(data.image_url);
    setSellingPrice(String(data.selling_price));
    setCostPrice(data.cost_price != null ? String(data.cost_price) : '');
    setStockQuantity(String(data.stock_quantity));
    setLowStockThreshold(String(data.low_stock_threshold));
    setIsActive(data.is_active);
  }

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError('Your session expired. Please log in again.');
      return;
    }

    let imageUrl = existingImageUrl;

    if (imageFile) {
      try {
        const compressed = await compressImage(imageFile);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, compressed, { contentType: 'image/jpeg' });

        if (uploadError) {
          setSaving(false);
          setError('Could not upload the photo. Try a different image.');
          return;
        }

        const newImageUrl = supabase.storage.from('product-images').getPublicUrl(path).data
          .publicUrl;

        // Best-effort cleanup of the replaced photo — don't block the
        // save if this fails.
        if (existingImageUrl) {
          const oldPath = existingImageUrl.split('/product-images/')[1];
          if (oldPath) {
            await supabase.storage.from('product-images').remove([oldPath]);
          }
        }

        imageUrl = newImageUrl;
      } catch {
        setSaving(false);
        setError('Could not process that image. Try a different photo.');
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name,
        description: description || null,
        image_url: imageUrl,
        selling_price: parseFloat(sellingPrice),
        cost_price: costPrice ? parseFloat(costPrice) : null,
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        is_active: isActive,
      })
      .eq('id', params.id);

    setSaving(false);

    if (updateError) {
      setError('Could not save this product. Check the fields and try again.');
      return;
    }

    router.push('/dashboard/products');
  }

  if (loading) {
    return (
      <main style={containerStyle}>
        <p style={{ color: '#666' }}>Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main style={containerStyle}>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>Product not found</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          It may have been removed, or it belongs to another store.
        </p>
        <Link href="/dashboard/products" style={{ color: '#111', fontWeight: 600 }}>
          Back to products
        </Link>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '1.5rem' }}>Edit product</h1>

        <label style={labelStyle}>
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <label style={labelStyle}>
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
            style={{ ...inputStyle, padding: '0.5rem 0' }}
          />
        </label>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(imagePreview || existingImageUrl) && (
          <img
            src={imagePreview || existingImageUrl || ''}
            alt="Preview"
            style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, marginBottom: '1rem' }}
          />
        )}

        <label style={labelStyle}>
          Selling price (₦)
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Cost price (₦, optional)
          <input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="Skip if unknown"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Stock quantity
          <input
            type="number"
            min="0"
            step="1"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Low stock warning threshold
          <input
            type="number"
            min="0"
            step="1"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Visible on storefront
        </label>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} style={buttonStyle}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        <Link
          href="/dashboard/products"
          style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.875rem', color: '#666' }}
        >
          Cancel
        </Link>
      </form>
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.375rem',
  padding: '0.625rem 0.75rem',
  fontSize: '1rem',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontFamily: 'inherit',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#fff',
  background: '#111',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
